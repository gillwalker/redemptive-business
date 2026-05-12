# redemptive.business

Website for the SMB Owners Collective and the Redemptive Business community.  
Hosted via **GitHub Pages** at [www.redemptive.business](https://www.redemptive.business).

---

## Repository Structure

```
/
├── index.html          ← Homepage (placeholder, replace when ready)
├── CNAME               ← Custom domain config for GitHub Pages
├── favicon.ico         ← Add your own favicon here
└── rsvp/
    └── index.html      ← RSVP page → www.redemptive.business/rsvp
```

---

## GitHub Pages Setup

1. Push this repository to GitHub (e.g. `github.com/YOURUSERNAME/redemptive-business`)
2. Go to **Settings → Pages**
3. Set **Source** to `Deploy from a branch` → `main` → `/ (root)`
4. GitHub will detect the `CNAME` file and configure `www.redemptive.business` automatically

---

## Custom Domain DNS Setup

At your DNS provider (wherever you manage `redemptive.business`), add these records:

| Type  | Host | Value                   |
|-------|------|-------------------------|
| A     | @    | 185.199.108.153         |
| A     | @    | 185.199.109.153         |
| A     | @    | 185.199.110.153         |
| A     | @    | 185.199.111.153         |
| CNAME | www  | YOURUSERNAME.github.io  |

Replace `YOURUSERNAME` with your actual GitHub username.  
DNS propagation typically takes 15 minutes to a few hours.

---

## Connecting Google Sheets (RSVP form)

The RSVP form sends data to a Google Apps Script Web App. To set it up:

1. Create a new **Google Sheet** with these column headers in row 1:
   ```
   Timestamp | First Name | Last Name | Company | Title | Email | Mobile Phone | SMS Reminder
   ```

2. In the spreadsheet, go to **Extensions → Apps Script** and paste:

```javascript
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  sheet.appendRow([
    new Date(),
    data.firstName,
    data.lastName,
    data.company,
    data.title,
    data.email,
    data.phone,
    data.smsReminder
  ]);
  return ContentService
    .createTextOutput(JSON.stringify({ result: 'success' }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. Click **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Copy the **Web App URL**
5. Open `https://www.redemptive.business/rsvp` in your browser
6. Paste the URL into the setup banner and click **Save URL**

The URL is stored in the visitor's browser (`localStorage`). For a permanent configuration, you can hardcode it directly into `rsvp/index.html` by replacing:

```javascript
var SHEETS_URL = '';
try { SHEETS_URL = localStorage.getItem('smbBreakfastSheetsUrl') || ''; } catch(e) {}
```

with:

```javascript
var SHEETS_URL = 'https://script.google.com/macros/s/YOUR_ACTUAL_ID/exec';
```

---

## Adding More Pages

To add a new page (e.g. `www.redemptive.business/about`):

```
/about/
    index.html
```

Create a folder with the page name and put an `index.html` inside it.

---

## Favicon

Add a `favicon.ico` to the root of the repository. Free generators:
- [favicon.io](https://favicon.io)
- [realfavicongenerator.net](https://realfavicongenerator.net)
