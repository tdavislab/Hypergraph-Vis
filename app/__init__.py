from flask import Flask
import os

APP_ROOT = os.path.dirname(os.path.abspath(__file__))   # refers to application_top
APP_STATIC = os.path.join(APP_ROOT, 'static')
UPLOAD_FOLDER = os.path.join(APP_STATIC,'uploads')
ALLOWED_EXTENSIONS = set(['txt'])
app = Flask(__name__)
app.config['DEBUG'] = True
app.config['ASSETS_DEBUG'] = True
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
from .util import assets
from app import views