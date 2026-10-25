# Guide: Skapa en permanent (icke-utgående) Facebook Page Access Token

Meta (Facebook) gör det medvetet lite krångligt, men genom att följa dessa 5 steg skapar du en **permanent Page Access Token som ALDRIG går ut** (`Expires: Never`).

---

### Förberedelse
1. Se till att du är inloggad på ditt vanliga Facebook-konto som är **administratör för Det 7:e Gungets Facebook-sida**.
2. Öppna [Meta for Developers Graph API Explorer](https://developers.facebook.com/tools/explorer/).

---

### Steg 1: Välj App och Behörigheter i Graph API Explorer
1. Uppe till höger: Välj er Meta-app i rullistan **Meta App** (t.ex. *Det Sjunde Gunget*).
2. I rullistan **User or Page**: Välj **User Token**.
3. Under **Permissions** (Behörigheter), klicka på **Add a Permission** och lägg till följande tre:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
4. Klicka på den blå knappen **Generate Access Token**.
5. Ett popup-fönster från Facebook öppnas: Klicka **Fortsätt som [Ditt namn]**, välj bandets sida och godkänn.
6. Du har nu en kortlivad *User Token* (gäller 1-2 timmar).

---

### Steg 2: Förläng till en 60-dagars User Token
1. Öppna ett nytt fönster/flik och gå till [Meta Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/).
2. Klistra in tokenn från Steg 1 i textfältet och klicka på **Debug**.
3. Scrolla längst ner på sidan. Där finns en knapp som heter **Extend Access Token**. Klicka på den.
4. Längst ner visas nu en ny, längre token. Klicka på knappen **Copy** bredvid den.
   *(Detta är en 60-dagars User Token).*

---

### Steg 3: Hämta den PERMANENTA Page Tokenn
*(Det är här magin sker: När du ber Meta om en Page Token med en 60-dagars User Token så blir sid-tokenn PERMANENT!)*

1. Gå tillbaka till fliken med [Graph API Explorer](https://developers.facebook.com/tools/explorer/).
2. Klistra in den kopierade 60-dagars-tokenn från Steg 2 i fältet **Access Token** högst upp.
3. I adressfältet i mitten (där det står `GET v20.0 / me?fields=id,name`), ändra texten så att det bara står:
   ```text
   me/accounts
   ```
4. Klicka på den blå knappen **Submit** till höger.
5. I rutan nedanför får du ett JSON-svar som ser ut ungefär så här:
   ```json
   {
     "data": [
       {
         "name": "Det 7:e Gunget",
         "id": "123456789012345",
         "access_token": "EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...",
         "category": "Musiker/band"
       }
     ]
   }
   ```
6. **Kopiera hela strängen** som står bakom `"access_token": "..."` för Det 7:e Gunget.
   👉 **Detta är er permanenta Page Access Token!**

---

### Steg 4: Dubbelkolla att den aldrig går ut (Valfritt men tryggt)
1. Gå till [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/) igen.
2. Klistra in din nya Page Token och klicka **Debug**.
3. Titta på raden **Data Access Expires** och **Expires**:
   - Det ska stå: **`Never`**! 🎉

---

### Steg 5: Spara i Vercel
1. Logga in på [Vercel Dashboard](https://vercel.com).
2. Gå till projektet `det-sjunde-gunget` ➔ **Settings** ➔ **Environment Variables**.
3. Leta upp variabeln **`FB_PAGE_ACCESS_TOKEN`**.
4. Klicka på de tre prickarna (⋯) till höger ➔ **Edit**.
5. Klistra in den nya permanenta tokenn och klicka **Save**.
6. *(Tips: Gör även en redeploy eller trigga ny build på Vercel så läser servern in den direkt).*
7. Nu kan ni dela gig och låtar direkt till Facebook från adminpanelen utan att det någonsin slutar fungera! 🎸🚀
