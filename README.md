# Crash Radar Vercel

Static Vercel-ready version for `https://crashradar.vercel.app/`.

## What changed in this version

- No Monetag or third-party ad scripts.
- Red and blue visual theme.
- Browser-generated scan, flight, and crash sounds after the user taps the scanner.
- Vercel config in `vercel.json`.
- Sitemap, robots, canonical, Open Graph, FAQ schema, and legal pages updated for the Vercel URL.

## Deploy on Vercel

Vercel's normal deployment methods are Git import or Vercel CLI.

### Option 1: GitHub import

1. Create a new GitHub repository.
2. Upload all files from this `CrashRadar-Vercel` folder into that repository.
3. Open Vercel and choose Add New Project.
4. Import the GitHub repository.
5. Leave framework preset as Other or Static if Vercel asks.
6. Leave build command empty.
7. Leave output directory empty or as the project root.
8. Deploy.

### Option 2: Vercel CLI

1. Install Vercel CLI if you do not have it.
2. Open a terminal inside this folder.
3. Run `vercel` for preview deploy.
4. Run `vercel --prod` for production deploy.

## After deploy

1. Open `/sitemap.xml` and `/robots.txt` on the final Vercel domain.
2. If your final Vercel URL is not `https://crashradar.vercel.app/`, update canonical URLs in the HTML files, `robots.txt`, and `sitemap.xml`.
3. Add the Vercel URL to Google Search Console as a new URL prefix property.
4. Submit the sitemap and request indexing for the homepage.

## SEO notes

The site targets terms such as `crash radar`, `free crash radar`, `aviator crash radar`, `aviator signal demo`, `crash point demo`, `crash multiplier tracker`, and `crash predictor disclaimer`.

No one can guarantee first or second place on Google. The site includes crawlable content, title tags, descriptions, canonical URLs, robots.txt, sitemap.xml, Open Graph tags, FAQ structured data, and legal pages to give it a strong starting point.