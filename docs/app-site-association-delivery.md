# Apple app-site-association delivery

The Pages artifact stages `.well-known/apple-app-site-association`, but GitHub
Pages does not provide a repository-level mechanism for setting the response
`Content-Type` of this extensionless file. The checked-in file alone is not
evidence that production serves Apple's required media type.

Production currently returns `200` with `Content-Type: application/octet-stream`
through Cloudflare and GitHub Pages. Before enabling universal-link features,
add a Cloudflare Response Header Transform Rule with this expression:

```text
(http.host eq "getseasons.app" and
 http.request.uri.path eq "/.well-known/apple-app-site-association")
```

Configure the rule to set this static response header, replacing any existing
value:

```text
Content-Type: application/json
```

Do not redirect the request. After deployment, acceptance requires a public
readback proving status `200`, no redirect, valid JSON matching the checked-in
file, and `Content-Type: application/json`.

```sh
curl --fail --silent --show-error --location-trusted \
  --max-redirs 0 --dump-header - \
  https://getseasons.app/.well-known/apple-app-site-association
```

This requirement is intentionally documented rather than represented as a
GitHub Pages configuration file, because Pages has no supported static header
configuration to deploy from this repository.
