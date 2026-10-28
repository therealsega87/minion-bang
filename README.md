# Minion! documentation

This branch holds the documentation site of [Minion!](https://github.com/therealsega87/minion-bang). It has no module code.

The site is published at https://therealsega87.github.io/minion-bang/ by the workflow in `.github/workflows/docs.yml`, on every push to this branch.

To build it locally:

```
pip install -r requirements-docs.txt
curl -fsSL https://raw.githubusercontent.com/therealsega87/minion-bang/main/CHANGELOG.md -o docs/project/changelog.md
mkdocs serve
```

The changelog page is copied from the `main` branch on every build and is not stored here.
