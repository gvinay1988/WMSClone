# Product Master Google Sheets Export Requirements

The Google Sheets export button is **not implemented yet**. This document lists the setup information and expected behavior needed before implementation.

## Information to provide

- Google Cloud project for this application.
- Google OAuth 2.0 **Web application client ID**. Do not share or add a client secret to the Angular app.
- Confirmation that the Google Sheets API is enabled for that project.
- The app's origins for development and deployment, such as `http://localhost:4200` and the production URL. Add these to the OAuth client's authorized JavaScript origins.
- Consent-screen configuration and the Google accounts permitted to authorize the app. For an app in testing mode, add the testing accounts as test users.

## Expected export behavior

- Add a separate Google Sheets download icon beside the existing Excel export icon on Product Master.
- Use the currently loaded Product Master list, with the same exported columns as the existing Excel export.
- Exclude product images and table action controls.
- Create a new spreadsheet in the signed-in user's Google Drive and write the product headers and rows into it.
- Request Google authorization only when the user starts this export. Do not store access tokens in source code or persist them unnecessarily.
- Show a success notification and provide a way to open the created spreadsheet. Show authorization, network, or API errors instead of silently failing.
- Put Google-specific authentication and Sheets API operations in a separate service; keep the component responsible for invoking the export and presenting its result.

## Security and configuration notes

- Use a browser OAuth flow appropriate for a single-page application. A client secret must never be shipped to the browser.
- Request only the Google permissions required to create and populate the user's spreadsheet.
- Store the public client ID in the app's environment/configuration rather than hard-coding it into the service.
- Confirm the OAuth consent screen, API enablement, authorized origins, and allowed users before testing the export.

## Completion checks

- An authorized user can create a spreadsheet containing the expected Product Master columns and rows.
- The created spreadsheet opens from the success action.
- Product images/actions are absent from the sheet.
- A denied or expired authorization and a Sheets API failure produce a visible error.
- Existing Excel download and upload continue to work unchanged.
