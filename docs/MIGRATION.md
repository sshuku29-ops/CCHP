# Migrating from the old Google Sheets

This guide is for the admin who moves CCHP's historical data into the platform.
You will do this once. Every step can be repeated safely: the importers skip
rows that already exist (volunteers) and you can always run a **dry run** first,
which checks the file and reports problems without saving anything.

Where: sign in as an Admin → **Volunteers** → **Import CSV** (`/volunteers/import`).

Do the three imports **in this order**:

1. Volunteer list (creates the accounts)
2. Hours log (needs the accounts to exist — rows are matched by email)
3. Record keeping sheet / sessions (also matched to accounts by email)

## Exporting a Google Sheet as CSV

1. Open the sheet in Google Sheets.
2. Make sure the **first row is the header row** with the exact column names
   shown below (lowercase, underscores, no spaces). Rename columns if needed —
   extra columns are ignored, missing ones cause every row to be skipped.
3. If the data is on a tab that is not the first one, click that tab.
4. **File → Download → Comma Separated Values (.csv)**. Only the current tab is
   exported.
5. Upload that `.csv` file on the import page (max 2 MB — split big sheets).
6. Leave **Dry run** ticked, click **Upload and run**, read the results.
7. Fix any skipped rows in the sheet, re-export, repeat until the dry run is
   clean, then untick **Dry run** and upload once more to save.

Row numbers in the results match the sheet's row numbers (row 1 is the header,
so the first data row is row 2).

Dates may be written as `YYYY-MM-DD` (e.g. `2025-09-14`) or `M/D/YYYY`
(e.g. `9/14/2025`, the Google Sheets default). Tip: select the date column and
use **Format → Number → Plain text** before exporting so Sheets does not
reformat it.

---

## 1. Volunteer list

Header line (copy exactly):

```
first_name,last_name,email,phone,graduation_date,has_vehicle
```

| Column | Required | Notes |
| --- | --- | --- |
| `first_name` | yes | |
| `last_name` | yes | |
| `email` | yes | Must be unique. Rows whose email already has an account are skipped. |
| `phone` | no | Any format. |
| `graduation_date` | no | `YYYY-MM-DD` or `M/D/YYYY`. Leave blank if unknown. |
| `has_vehicle` | no | `yes` / `no` (also accepts y/n, true/false, 1/0). Blank = no. |

Example:

```
first_name,last_name,email,phone,graduation_date,has_vehicle
Ava,Chen,ava.chen@colby.edu,207-555-0101,2027-05-20,yes
Noah,Patel,noah.patel@colby.edu,,5/20/2026,no
```

What happens for each valid row:

- A **Volunteer** account is created with username `first.last` (lowercase; a
  number is appended if that username is taken, e.g. `ava.chen2`).
- A random 12-character **temporary password** is generated. It is shown
  **once** in the results table after a real (non-dry-run) import. Copy the
  table straight away and send each person their password privately; they are
  forced to choose a new one the first time they sign in.
- Role is always Volunteer. Promote people to Admin afterwards under
  **Users & roles** (Main Admin only).

Only the fields allowed by the spec are imported (name, email, phone, graduation
date, has vehicle). Do not add other personal data to the sheet.

## 2. Hours log (old weekly Google Form responses)

Header line:

```
email,date,hours,type,notes
```

| Column | Required | Notes |
| --- | --- | --- |
| `email` | yes | Must match an existing account's email (import volunteers first). |
| `date` | yes | `YYYY-MM-DD` or `M/D/YYYY` — the date the hours were done. |
| `hours` | yes | A number between 0 and 24, decimals allowed (`1.5`). |
| `type` | no | `formal`, `informal`, `prep` or `other` (case does not matter; `Formal session` also works). Blank = other. |
| `notes` | no | Free text. |

Example:

```
email,date,hours,type,notes
ava.chen@colby.edu,9/14/2025,2,formal,Nutrition session
ava.chen@colby.edu,2025-09-12,1.5,prep,Slides and handout
noah.patel@colby.edu,9/14/2025,2,Formal,
```

Converting the Form responses sheet: the Google Form usually produces columns
like `Timestamp`, `Email Address`, `Date`, `Hours`, `Type of activity`, `Notes`.
Insert a new first row with the header above (or rename the existing headers),
delete the `Timestamp` column, and export. If the Form asked for a *week* rather
than a date, use the Monday of that week.

Rows with an email that has no account are skipped and listed; nothing else in
the file is affected. Re-running the hours import **does** create duplicates
(there is no unique key for an hours entry), so only run it for real once per
file.

## 3. Record keeping sheet (sessions)

Header line:

```
date,type,topic,participants,volunteer_emails,notes,materials
```

| Column | Required | Notes |
| --- | --- | --- |
| `date` | yes | `YYYY-MM-DD` or `M/D/YYYY`. Term ("Fall 2025") and academic year are worked out from it. |
| `type` | yes | `FORMAL` or `INFORMAL` (case does not matter). |
| `topic` | no | e.g. `Nutrition on a budget`. Also used as the title. |
| `participants` | no | **A whole number** of residents who attended. Never names or any detail about residents. Blank = 0. |
| `volunteer_emails` | no | Emails of the volunteers who ran it, separated by `;`. Every email must match an account or the row is skipped. |
| `notes` | no | Free text. |
| `materials` | no | Links in the form `label|url;label|url`. URLs must start with `http://` or `https://`. A bare URL without a label is fine. |

Example:

```
date,type,topic,participants,volunteer_emails,notes,materials
9/14/2025,FORMAL,Nutrition on a budget,14,ava.chen@colby.edu;noah.patel@colby.edu,Went well,Slides|https://docs.google.com/presentation/d/abc;Handout|https://drive.google.com/file/d/xyz
2025-09-21,informal,Game night,9,noah.patel@colby.edu,,
```

In Google Sheets the old record keeping sheet probably has volunteers in
several columns (Volunteer 1, Volunteer 2, …). Combine them into one
`volunteer_emails` cell with a formula such as
`=TEXTJOIN(";",TRUE,E2:H2)` in a new column, then copy → paste values only,
and delete the original columns before exporting.

Re-running this import creates duplicate session records, so run it for real
once per file. If you make a mistake, delete the sessions under **Sessions**
(each session page has a Delete button) and import again.

## After importing

- Check **Volunteers** — sessions participated and hours should now be filled in.
- Check **Sessions** — filter by term to compare with the old sheet.
- Open **Annual reports** → the year in question: the metrics panel is computed
  from what you just imported.
- Export CSVs from each page any time as a backup (the Export CSV buttons).

## Troubleshooting

| Message | Fix |
| --- | --- |
| `first_name: first_name is required` | The header row is wrong or the column is empty. Check spelling and underscores. |
| `email already has an account` | Expected on a re-run; nothing to do. |
| `no account with email …` | Import the volunteer list first, or fix the typo in the email. |
| `date "…" is not YYYY-MM-DD or M/D/YYYY` | The date column was reformatted by Sheets. Use Format → Number → Plain text. |
| `type "…" must be FORMAL or INFORMAL` | Only those two values are accepted for sessions. |
| `materials must be label|https://…` | Each link needs `http(s)://` and links are separated by `;`. |
| "Only .csv files are accepted" | Download as CSV, not .xlsx or .tsv. |
| "The file is larger than 2 MB" | Split the sheet into several exports. |
