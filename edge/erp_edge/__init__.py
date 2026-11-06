"""ERP Edge Collector — fabrikadaki tek bilgisayarda çalışan veri toplama ajanı.

Bu paket yalnızca Python standart kütüphanesini kullanır; PyInstaller ile tek
bir Windows .exe dosyasına paketlenir. ERP'nin kullanıcı arayüzü değildir:
sensör/PLC verisini okur, yerel SQLite veritabanına yazar ve ERP'ye gönderir.
Gereksinim kaynağı: docs/04, docs/08, docs/12 ve docs/13.
"""

__version__ = '1.3.0'
SCHEMA_VERSION = 1
FOUR_SIGNALS = ('door', 'casting', 'alarm', 'running')
