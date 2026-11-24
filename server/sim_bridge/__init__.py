"""ERP Studio ↔ kullanıcı simülasyonu köprüsü (docs/14).

Simülasyon kullanıcının makinesinde çalışır (`erp_backend`, :8000). Bu paket
onun REST uçlarını ERP arayüzüne taşır ve edge ajanının imzalı batch'lerini
kabul eder. İşletme tablolarına yazım yapmaz.
"""

__version__ = '1.4.2'
