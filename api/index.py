from flask import Flask, jsonify, request
import requests

app = Flask(__name__)

@app.route('/api/test')
def hello():
    return jsonify({"message": "Vercel Python API is working!"})

# ここに自動収集のロジックなどを後で入れられます
