# Hverdags 1.0 — eget gratis Supabase-prosjekt

Dette er **et helt eget Supabase-prosjekt** for Hverdags, med egen brukerinnlogging, egne tabeller og egne gratisgrenser. Det deler ikke Supabase med PingPong eller vektappen.

## Hva er gjort
- Opprettet nytt Supabase-prosjekt `Hverdags` i Stockholm (`eu-north-1`) på gratisnivå.
- Opprettet fem tabeller for hjem, medlemmer, oppgaver, handleliste og kalender, alle med RLS aktivert.
- Konfigurert `.env.local` med prosjektets **offentlige** Supabase-adresse og publishable key. **Ingen hemmelig nøkkel** er lagret her.
- Vektapp-prosjektet er satt på pause for å gi plass på gratisnivå. Eksisterende vektdata er ikke slettet.

## Start i Windows
1. Pakk ut denne mappen et nytt sted. Ikke bland filer med gammel `hverdags-v1.0-gratis`.
2. Dobbeltklikk `START-HVERDAGS.bat` for å installere npm-avhengigheter og starte utviklingsserveren.
3. Åpne http://localhost:3000.
4. Lag din egen bruker; kjæresten lager sin egen bruker i samme app. Når e-postbekreftelse er aktiv, bekreft kontoen via lenken i e-post.
5. Den første oppretter et hjem og deler invitasjonskoden med den andre. Den andre velger «Bli med».

### For e-postbekreftelse lokalt
Supabase Dashboard → Hverdags → Authentication → URL Configuration → legg til `http://localhost:3000/**` under Redirect URLs hvis nødvendig. Ikke erstatt eventuelle adresser du vil bruke senere.

### Hvis Windows-terminalen blokkerer `npm.ps1`
Bruk `npm.cmd install` og `npm.cmd run dev` i PowerShell.

### Kjør kontrollene
```powershell
npm.cmd install
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd audit
```

## Viktig
- Du skal **ikke** kjøre `supabase/schema.sql` i Supabase SQL Editor; databasen er allerede opprettet. SQL-filen følger med som referanse.
- Hverdags er konfigurert for lokal kjøring, ikke offentlig publisert. For å åpne den fra mobilen din og kjæresten sin må vi publisere appen over HTTPS og oppdatere Auth-redirect-URL-ene.
- Det er **0 kr/mnd i oppgitt prosjektpris**, men gratistjenesten har grenser. Ikke aktiver betalt abonnement, bruk eller add-ons.
- Supabase sine e-poster for registrering/reset kan ha rate limiting på gratisnivå.
- Full funksjonstest med to ekte kontoer må gjennomføres før sensitive opplysninger legges inn.
