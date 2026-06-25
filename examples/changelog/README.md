# Changelog examples

Sample release JSON for the changelog editor.

In the app: open **Admin -> Changelog -> Import**, then paste the contents of
`example-release.json` or upload the file. It loads into the editor for review
before you save.

Shape: a release object with `version`, `title`, optional `is_published`, and a
`body` array of content blocks. Each block has a `kind` - one of `heading`,
`paragraph`, `list`, `steps`, `code`, `note`, `badge`, `image`, `linkButton`,
`demo` - plus its own fields (see `example-release.json`). Unknown kinds and
malformed fields are dropped on import.
