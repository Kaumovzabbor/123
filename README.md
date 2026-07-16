# To'lovlar daftari — GitHub Actions orqali APK qurish

## 1-qadam: GitHub'da yangi repozitoriy yarating
1. https://github.com/new ga kiring.
2. Repozitoriy nomini kiriting (masalan `tolovlar-daftari`).
3. "Public" yoki "Private" — ikkalasi ham ishlaydi.
4. "Create repository" tugmasini bosing.

## 2-qadam: Fayllarni yuklang
Bu papkadagi barcha fayllarni (`.github` papkasi bilan birga) yangi repozitoriyga yuklang:

**Brauzer orqali (eng oson):**
1. Repozitoriy sahifasida "uploading an existing file" havolasini bosing.
2. Ushbu papkadagi barcha fayl va papkalarni (yashirin `.github` papkasi ham) sudrab tashlang.
3. "Commit changes" tugmasini bosing.

**Yoki terminal orqali:**
```bash
cd tolovlar-daftari
git init
git add .
git commit -m "Birinchi versiya"
git branch -M main
git remote add origin https://github.com/FOYDALANUVCHI_NOMI/tolovlar-daftari.git
git push -u origin main
```

## 3-qadam: APK qurilishini kuzating
1. Repozitoriyingizda "Actions" bo'limiga o'ting.
2. "Build Android APK" workflow'i avtomatik ishga tushadi (fayllar yuklangandan so'ng).
3. Taxminan 5-8 daqiqa kutasiz (Android SDK yuklab olinishi kerak).
4. Workflow tugagach, "Summary" sahifasida "Artifacts" bo'limida `tolovlar-daftari-apk` faylini ko'rasiz.
5. Shu faylni yuklab oling — bu ZIP ichida `app-debug.apk` bor.

## 4-qadam: Telefoningizga o'rnatish
1. `app-debug.apk` faylini telefoningizga ko'chiring (Google Drive, Telegram, USB va h.k. orqali).
2. Telefoningizda faylni oching.
3. Agar "Noma'lum manbalardan o'rnatish" haqida ogohlantirish chiqsa — ruxsat bering (Sozlamalar > Xavfsizlik).
4. O'rnatish tugmasini bosing.

Tayyor — ilova telefoningizda ishlaydi, internet talab qilmaydi, barcha ma'lumotlar qurilmada saqlanadi.

## Qo'lda ishga tushirish
Agar workflow avtomatik ishlamasa, "Actions" > "Build Android APK" > "Run workflow" tugmasini bosib qo'lda ishga tushirishingiz mumkin.

## Ilovani o'zgartirish
Asosiy kod `src/App.jsx` faylida. O'zgartirish kiritib, qayta `git push` qilsangiz, APK avtomatik qayta quriladi.
