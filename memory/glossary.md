# Glossary — VSK

## Acronyms / Terms
| Term | Meaning |
|------|---------|
| VSK | PT Varian Sumber Karya (perusahaan Tony) |
| EC | Electrical Conductivity — parameter kualitas cocopeat |
| PWA | Progressive Web App (frontend pattern yang dipakai) |
| CF | Cloudflare (Workers untuk hosting frontend) |
| Apps Script | Google Apps Script (backend serverless, bound ke Sheets) |
| Rawmat | Raw material — modul Bahan Baku |
| SDLC | Software Development Life Cycle (Tony lagi belajar ini) |

## Domain (Cocopeat / Produksi)
| Term | Meaning |
|------|---------|
| Cocopeat | Media tanam dari serbuk sabut kelapa (produk utama VSK) |
| Cocofiber | Serat sabut kelapa (produk turunan) |
| Basah | Bahan baku cocopeat mentah (kg) |
| Kering | Hasil olah cocopeat kering (kg) |
| Block | Cocopeat di-press jadi block padat (pcs) |
| High EC | Block dengan EC tinggi (akan dipisah dari Low EC — task #4) |
| Low EC | Block dengan EC rendah |
| Susut | Loss ratio basah → kering (%) |
| Karung | Unit kemasan rawmat masuk |
| Shift | Sesi produksi (1 row di tab Produksi per shift) |
| Batch | Satu kedatangan rawmat (1 row di Rawmat_Kedatangan, N rows di Rawmat_Karung) |

## Codenames / Repo Names
| Name | What |
|------|------|
| **vsk-sistem** | Monorepo target (Produksi + Bahan Baku gabungan) — current production |
| **vsk-produksi** | Legacy repo modul Produksi (masih live sebagai fallback) |
| **vsk-bahan-baku** | Legacy repo modul Bahan Baku — production |
| **vsk-bahan-baku-staging** | Legacy repo modul Bahan Baku — staging |
| **VSK_AppsScript_v6.js** | Backend versi sebelumnya |
| **VSK_AppsScript_v7.js** | Backend current (di workspace `Production Automation - VSK/`) |

## People
| Nickname | Full Name | Role |
|----------|-----------|------|
| **Tony** | Variantony | CEO + dev VSK (the user) |
