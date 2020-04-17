from flask import Flask, g
from flask_session import Session
from file_upload import upload
from views import views
from utils.CompGraph import CompGraph
import os

ALLOWED_EXTENSIONS = {'txt', 'csv'}

app = Flask(__name__)
APP_ROOT = os.path.dirname(os.path.abspath(__file__))
app.config['UPLOAD'] = os.path.join(APP_ROOT, 'static', 'uploads')
app.secret_key = b'\x9a\xc6\xb24\x9e\xab\xa5\x1dW\x10+\xaf>\xd9\tjzP\xbf%]\xf9`2'
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_FILE_DIR'] = app.config['UPLOAD']
app.comp_graph = CompGraph()
Session(app)

app.register_blueprint(upload)
app.register_blueprint(views)
