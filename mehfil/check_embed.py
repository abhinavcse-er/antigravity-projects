import urllib.request
import json

test_ids = [
    ("Tum Se Hi (orig)", "mt9xg0mmt60"),
    ("Kesariya (orig)", "BddP6PYo2gs"),
    ("Choo Lo", "sFMRqxCexDk"),
    ("Baarishein", "dZ0fwJojhrs"),
    ("Tum Se Hi (alt 1)", "gK0oR0u-i_g"),
    ("Tum Se Hi (alt 2)", "cb0vD_i2p-0")
]

for label, vid in test_ids:
    url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={vid}&format=json"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode())
            print(f"[OK 200] {label} ({vid}): {data.get('title')[:40]}")
    except Exception as e:
        print(f"[BLOCKED] {label} ({vid}): {e}")
