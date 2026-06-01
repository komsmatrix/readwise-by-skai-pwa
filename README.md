# Readwise by Skai — PWA Setup Guide
# ─────────────────────────────────────────────────────────────────────────────

## OVERVIEW
This is the Progressive Web App version of Readwise by Skai.
Customers open it in any browser on any device — no installer needed.

URL format: https://readwise-by-skai.vercel.app
Owner dashboard: https://readwise-by-skai.vercel.app/owner


## STEP 1 — Run the database schema in Supabase

1. Go to supabase.com → your readwise-by-skai project
2. Click "SQL Editor" in the left sidebar
3. Click "New query"
4. Open the file: supabase/migrations/001_schema.sql
5. Copy the entire contents and paste into the SQL editor
6. Click "Run"

You should see: "Success. No rows returned"


## STEP 2 — Create a new GitHub repo for the PWA

1. Go to github.com → New repository
2. Name: readwise-by-skai-pwa
3. Set to PUBLIC (Vercel needs to read it for free tier)
4. Do NOT add README
5. Click "Create repository"

Then in your terminal:
  cd "C:\Users\mkyle\Downloads\project\readwise-pwa"
  git init
  git add .
  git commit -m "Initial PWA build"
  git branch -M main
  git remote add origin https://github.com/komsmatrix/readwise-by-skai-pwa.git
  git push -u origin main


## STEP 3 — Deploy to Vercel

1. Go to vercel.com → Sign in with GitHub
2. Click "Add New Project"
3. Import "readwise-by-skai-pwa" from GitHub
4. Framework preset: Vite
5. Click "Environment Variables" and add ALL of these:

   VITE_SUPABASE_URL          = https://tizegwvlksgqtvlkiwvb.supabase.co
   VITE_SUPABASE_ANON_KEY     = eyJhbGci...duho  (your anon key)
   SUPABASE_SERVICE_ROLE      = eyJhbGci...nUA   (your service role key)
   RESEND_API_KEY             = re_NZ7XGMwf_...  (your Resend key)
   OWNER_PASSWORD             = (create a strong password — e.g. Skai2025!)
   VITE_APP_URL               = https://readwise-by-skai.vercel.app
   VITE_APP_NAME              = Readwise by Skai
   VITE_GDRIVE_LINK           = https://drive.google.com/file/d/1Cf1iGdpQNNMqjdtmgsdADzOnMdCbeYqZ/view?usp=sharing

6. Click "Deploy"
7. Wait 2-3 minutes
8. Your app is live!


## STEP 4 — Upload your books to Supabase Storage

For each book in your library:

1. Go to supabase.com → Storage
2. Open the "books" bucket
3. Upload each PDF file
4. Upload each HTML text file (the .html versions)
5. Open the "covers" bucket
6. Upload each cover image

Then add the book records to the "books" table:
1. Go to supabase.com → Table Editor → books
2. Click "Insert row" for each book
3. Fill in: id, title, author, category, file_path, text_path, cover_path, preferred_mode, text_quality, pages

File paths should match exactly what you uploaded in Storage.
Example: file_path = "finance/atomic-habits.pdf"


## STEP 5 — Generate your owner key in Supabase

1. Go to supabase.com → Table Editor → access_keys
2. Click "Insert row"
3. Fill in:
   key        : YOUR-OWNER-KEY  (e.g. SKAI-OWNS-THIS)
   name       : Skai
   email      : readwisebyskai@gmail.com
   is_owner   : true
   expires_at : (leave blank)
4. Save

Now go to your live URL, enter your name, email, and that key.
You'll have full access on any device.


## STEP 6 — Test everything

1. Open your Vercel URL in a browser
2. Enter your name, email, and owner key
3. You should see your library
4. Click a book — it should open in Text Mode
5. Go to /owner — enter your OWNER_PASSWORD
6. Generate a test key for yourself


## OWNER DASHBOARD

URL: https://your-app.vercel.app/owner
Password: whatever you set as OWNER_PASSWORD in Vercel

Features:
- Generate Key — type name + email → key created + email sent automatically
- Customers — see all customers, copy all emails to BCC
- Send Update — send library update email to all customers at once


## DAILY WORKFLOW (after PWA is live)

When someone buys:
  1. Open /owner on your phone
  2. Go to "Generate Key" tab
  3. Type their name + email
  4. Tap "Generate Key & Send Email"
  5. Done — they get the email automatically with their key and app link

When you add new books:
  1. Upload PDF + HTML + cover to Supabase Storage
  2. Add record to books table in Supabase
  3. Book appears instantly for ALL customers — no ZIP, no update button

To notify customers about new books:
  1. Open /owner → "Send Update" tab
  2. Type subject + new book titles
  3. Tap Send
  4. All customers get personalized emails


## BOOK UPLOAD SCRIPT (for migrating existing books)

To upload all your existing books at once, run:
  node upload-books.js

(This script will be provided in the next session)
