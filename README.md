# Hverdags — GitHub Pages + eget Supabase-prosjekt

Denne versjonen er laget for **gratis GitHub Pages** og bruker det **separate gratis Supabase-prosjektet Hverdags** til innlogging og private/felles data. PingPong og vektappen ligger ikke i denne databasen.

## Rask publisering (Windows / PowerShell)

1. [Opprett et nytt GitHub-repository](https://github.com/new) med navnet **hverdags**. Sett **Public** og **ikke** velg «Add a README» eller .gitignore (filene ligger i prosjektet allerede). Dette er nødvendig for GitHub Pages på gratis GitHub-konto.
2. Pakk ut ZIP og åpne denne prosjektmappen i VS Code. Åpne **Terminal → New Terminal**.
3. **Enklest:** Dobbeltklikk `PUBLISER-GITHUB.bat` i prosjektmappen. Skriv inn GitHub-brukernavnet ditt. Skriptet installerer pakkene, lager lockfil og sender filene til repoet. Hvis dette fungerer, gå direkte til punkt 5.

   **Alternativt, via terminal:** Først lager du `package-lock.json` på din egen PC (jeg kunne ikke hente npm-pakkene i testmiljøet). Kjør **`npm.cmd install`** i prosjektmappen. Dette oppretter lockfilen som GitHub Actions trenger.
4. Kjør så kommandoene under (endre `<GITHUB-BRUKERNAVN>` til ditt GitHub-brukernavn):

```powershell
git init
git branch -M main
git add .
git commit -m "Publiser Hverdags"
git remote add origin https://github.com/<GITHUB-BRUKERNAVN>/hverdags.git
git push -u origin main
```

Git må være installert: https://git-scm.com/downloads. Ved innlogging kan Git Credential Manager be deg logge inn i nettleseren. **Ikke last opp bare ZIP-filen**; det er filene *inni* mappen som skal ligge i GitHub-repositoryets rot. `.github/workflows/deploy.yml` må være med.

5. I GitHub-repositoryet: **Settings → Pages → Build and deployment → Source → GitHub Actions**. Åpne **Actions** og kontroller at `Publiser Hverdags på GitHub Pages` får grønn status. Hvis bygget skjedde før Pages ble aktivert, klikk **Run workflow**.
6. Åpne `https://<GITHUB-BRUKERNAVN>.github.io/hverdags/` (bruk eksakt store/små bokstaver hvis repository-navnet er annerledes).
7. Åpne [Supabase Hverdags → Authentication → URL Configuration](https://supabase.com/dashboard/project/ysmlqcpgmweelvmraynr/auth/url-configuration). Sett `Site URL` til **akkurat denne GitHub Pages-adressen**, med `/hverdags/`. Legg samme adresse til under `Redirect URLs` (og eventuelt `http://localhost:3000/**` for lokal testing). Trykk **Save**.
8. Lag kontoen din i Hverdags og bekreft e-post. Opprett hjem. La kjæresten opprette egen konto, bekrefte sin e-post og velge **Bli med** med invitasjonskoden din.

## Lokalt

Dobbeltklikk `START-HVERDAGS.bat` og åpne http://localhost:3000. Alternativt:

```powershell
npm.cmd install
npm.cmd run dev
```

Merk: Siden Next.js er satt til statisk eksport, er `npm run start` ikke relevant. For lokal utvikling bruk `npm run dev`.

## Viktig om kostnader og sikkerhet

- GitHub Pages er gratis ved bruk av offentlig repository innenfor GitHubs grenser. Koden i repoet er offentlig, men Hverdags-dataene er bak Supabase Auth og RLS. Ikke legg inn service_role/secret keys i repoet.
- URL og `sb_publishable_`-nøkkelen i `.github/workflows/deploy.yml` er ment å kunne være offentlige. `.env.local` er ignorert av Git.
- Supabase-prosjektet Hverdags er opprettet på gratisnivå. Ved overskridelse av gratisgrensene kan tjenesten begrenses/pauses; **aktiver ingen betalte planer eller tjenester**.
- URL for bekreftelse/nullstilling må peke til den riktige `/hverdags/`-stien. Bruk HTTPS på GitHub Pages.
- Test med to separate kontoer at private oppgaver og avtaler ikke dukker opp hos den andre før du lagrer sensitiv informasjon.
- `supabase/schema.sql` ligger i repoet kun som referanse; databasen er allerede satt opp – **ikke kjør SQL-filen igjen**.

## Endringer i GitHub Pages-versjonen

- `output: 'export'` lager statiske filer til GitHub Pages.
- GitHub Actions oppdager automatisk repository-navnet og bruker riktig `basePath`.
- App-manifest og ikoner bruker relative stier.
- Bekreftelse og passordtilbakestilling leder tilbake til appens riktige URL.
- `npm ci` og lockfil gir reproduserbar installasjon i GitHub Actions. Lockfil må genereres og commits ved første publisering.
