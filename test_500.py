import urllib.request
import json

url = "http://localhost:8080/api/v1/dtic/knowledge/articles?limit=10"
try:
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as response:
        print("Status:", response.status)
        print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
    try:
        print("Response Body:", e.read().decode('utf-8'))
    except Exception as ex:
        print("Could not read body:", ex)
except Exception as e:
    print("Error:", e)
