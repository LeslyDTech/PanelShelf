# PanelShelf

PanelShelf is a free personal collection tracker for comic issues, graphic novels, and manga.

It was built for readers who want to organize their shelves, wishlists, and current reads without needing another paid subscription.

## Live Site


[Visit PanelShelf](https://leslydtech.github.io/PanelShelf/)

## Features

- Create an account and confirm an email address
- Sign in, sign out, and reset a forgotten password
- Add comic issues, graphic novels, and manga
- Track items as owned, reading, read, or on a wishlist
- Search, filter, sort, edit, and remove collection items
- See recently added items beside the add-item form
- Export a personal collection as a CSV file
- Find focused cover suggestions through Google Books
- Upload custom covers securely with Supabase Storage
- Show a live count of confirmed PanelShelf members
- Founder-only "Currently Reading" status
- Responsive layout for phones, tablets, and desktop screens
- Keyboard focus states, labeled form controls, semantic HTML, and screen-reader status messages

## Built With

- HTML
- CSS
- JavaScript
- Supabase Auth
- Supabase Database with Row Level Security
- Supabase Storage
- Supabase Edge Functions
- Google Books API
- GitHub Pages

## Design Decisions

PanelShelf uses Supabase Row Level Security so each signed-in person can access only their own collection data.

Google Books cover searches run through a Supabase Edge Function. This keeps the Google Books API key private instead of placing it in browser code or on GitHub.

Uploaded covers are stored in Supabase Storage under folders connected to each signed-in user's account.

Google Books is useful for finding many graphic novels and manga volumes, but its comic issue data is incomplete. PanelShelf searches for exact titles and issue or volume numbers first, then lets readers upload their own cover when a result is unavailable.

I chose vanilla JavaScript so I could learn the complete flow between the interface, authentication, database, image storage, and server-side API requests.

## Accessibility

- Visible keyboard focus outlines
- Form labels connected to inputs
- Semantic page sections and navigation
- Meaningful image alt text
- Screen-reader announcements for search, upload, sign-in, and password-reset messages
- Responsive layouts for narrow phone screens
- Descriptive labels for icon-only controls

## About

PanelShelf was created by Lesly Davila as a personal project for comic readers who want a simple and free way to track their collections.

## Copyright

Copyright © 2026 Lesly Davila. All rights reserved.

This repository is public for viewing as a code sample. No permission is granted to copy, redistribute, modify, or use this project or its code for another project.
