from __future__ import annotations

import io
import json
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest import mock
from urllib.error import HTTPError

from scripts import refresh_landing_trends as trends


def snapshot(age: timedelta, title: str) -> dict[str, object]:
    return {
        "updatedAt": (datetime.now(timezone.utc) - age).isoformat(),
        "shows": [{"id": rank, "title": f"{title} {rank}", "poster": "p", "rank": rank} for rank in range(1, 13)],
        "providers": [{"id": str(index), "name": f"Network {index}", "logo": "l"} for index in range(4)],
    }


def catalog_page() -> dict[str, object]:
    return {
        "generatedAt": "2026-09-26T11:07:45Z",
        "staleAt": "2026-09-26T12:07:45Z",
        "attribution": {"source": "tmdb"},
        "items": [{"tmdbId": rank, "title": f"Live {rank}", "posterPath": f"/{rank}.jpg"} for rank in range(1, 13)],
    }


def unavailable(url: str) -> HTTPError:
    return HTTPError(url, 503, "Service Unavailable", None, None)


class JSONResponse(io.BytesIO):
    def __init__(self, body: object) -> None:
        super().__init__(json.dumps(body).encode("utf-8"))

    def __enter__(self) -> JSONResponse:
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()


class RefreshLandingTrendsTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary_directory.cleanup)
        self.output = Path(self.temporary_directory.name) / "trending-shows.json"
        self.addCleanup(mock.patch.stopall)
        mock.patch.object(trends, "OUTPUT", self.output).start()
        mock.patch.object(trends.time, "sleep").start()

    def write_checked_in(self, value: dict[str, object]) -> None:
        self.output.write_text(json.dumps(value), encoding="utf-8")

    def written(self) -> dict[str, object]:
        return json.loads(self.output.read_text(encoding="utf-8"))

    def serve(self, routes: dict[str, list[object]]) -> None:
        def urlopen(request: object, timeout: float) -> JSONResponse:
            outcome = routes[request.full_url].pop(0)
            if isinstance(outcome, Exception):
                raise outcome
            return JSONResponse(outcome)

        mock.patch.object(trends, "urlopen", urlopen).start()

    def test_retries_a_transient_catalog_outage(self) -> None:
        self.write_checked_in(snapshot(timedelta(days=13), "Checked in"))
        self.serve({trends.SOURCE: [unavailable(trends.SOURCE), catalog_page()]})
        networks = snapshot(timedelta(0), "unused")["providers"]
        mock.patch.object(trends, "current_networks", return_value=networks).start()

        self.assertEqual(trends.main(), 0)

        self.assertEqual(self.written()["shows"][0]["title"], "Live 1")

    def test_falls_back_to_the_deployed_snapshot_when_the_checked_in_one_is_stale(self) -> None:
        self.write_checked_in(snapshot(timedelta(days=13), "Checked in"))
        self.serve({
            trends.SOURCE: [unavailable(trends.SOURCE)] * trends.ATTEMPTS,
            trends.DEPLOYED: [snapshot(timedelta(hours=6), "Deployed")],
        })

        self.assertEqual(trends.main(), 0)

        self.assertEqual(self.written()["shows"][0]["title"], "Deployed 1")

    def test_keeps_a_fresh_checked_in_snapshot_when_the_deployed_one_is_unreachable(self) -> None:
        self.write_checked_in(snapshot(timedelta(days=2), "Checked in"))
        self.serve({
            trends.SOURCE: [unavailable(trends.SOURCE)] * trends.ATTEMPTS,
            trends.DEPLOYED: [unavailable(trends.DEPLOYED)],
        })

        self.assertEqual(trends.main(), 0)

        self.assertEqual(self.written()["shows"][0]["title"], "Checked in 1")

    def test_refuses_to_publish_when_every_snapshot_is_older_than_eight_days(self) -> None:
        self.write_checked_in(snapshot(timedelta(days=13), "Checked in"))
        self.serve({
            trends.SOURCE: [unavailable(trends.SOURCE)] * trends.ATTEMPTS,
            trends.DEPLOYED: [snapshot(timedelta(days=9), "Deployed")],
        })

        with self.assertRaisesRegex(RuntimeError, "older than 8 days"):
            trends.main()


if __name__ == "__main__":
    unittest.main()
