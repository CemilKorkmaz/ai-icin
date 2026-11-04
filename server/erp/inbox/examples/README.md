# Örnek kuyruk kayıtları

Bu iki dosya `event_worker.py --dry-run` içindir ve bilinçli olarak sürüm kontrolünde tutulur. Gerçek `inbox/*.json` kayıtları çalışma zamanında üretilir ve `.gitignore` ile dışarıda bırakılır.

- `CL-2001`: `CUT_BATCH` — worker `docs/07` formülleriyle `HEAD_CUT`, `SAWDUST`, `NET_BILLET` olaylarını türetir.
- `CL-2002`: `HOMOGEN_START` — karışık parti ve planlanan süre olayı.
