from __future__ import annotations

import json
import unittest
from pathlib import Path

from scripts.stage_pages import PUBLIC_DIRECTORIES, PUBLIC_FILES


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]


class AppLinksTests(unittest.TestCase):
    def test_aasa_preserves_account_links_and_adds_canonical_app_routes(self) -> None:
        association = json.loads(
            (REPOSITORY_ROOT / ".well-known/apple-app-site-association").read_text(
                encoding="utf-8"
            )
        )

        details = association["applinks"]["details"]
        self.assertEqual(details[0]["appIDs"], ["HB5HXZR273.com.myvstudios.Seasons"])
        paths = [component["/"] for component in details[0]["components"]]
        self.assertEqual(
            paths,
            [
                "/family-invite",
                "/verify-contact-email",
                "/recover-account",
                "/replace-contact-email",
                "/movies/*",
                "/shows/*/seasons/*/episodes/*",
                "/shows/*",
                "/watchlist",
                "/plan/actions/*",
                "/plan",
                "/subscriptions/*",
            ],
        )

    def test_app_link_fallback_assets_and_fixed_routes_are_public(self) -> None:
        self.assertIn("404.html", PUBLIC_FILES)
        self.assertIn("app-link-fallback.css", PUBLIC_FILES)
        self.assertIn("app-link-fallback.mjs", PUBLIC_FILES)
        self.assertIn("plan", PUBLIC_DIRECTORIES)
        self.assertIn("watchlist", PUBLIC_DIRECTORIES)


if __name__ == "__main__":
    unittest.main()
