# Safe project duplication

The dashboard and project list now expose a **Kopiér** action for each website.

- Creates a separate project with a new project ID and fresh block IDs.
- Keeps the original project unchanged.
- Starts the copy as a draft and clears its domain and published state so it cannot be mistaken for the live website.
- Clears customer linkage and edit history; the copied website content remains available for editing.
- Opens the new copy in the editor.

This is a browser-side project operation using the existing project storage adapter. It does not publish a site, provision a domain, send data externally, or require an API key.
