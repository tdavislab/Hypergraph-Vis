from flask import Flask
import os

APP_ROOT = os.path.dirname(os.path.abspath(__file__))  # refers to application_top
APP_STATIC = os.path.join(APP_ROOT, 'static')
UPLOAD_FOLDER = os.path.join(APP_STATIC, 'uploads')
ALLOWED_EXTENSIONS = {'txt', 'csv'}
app = Flask(__name__)
app.config['DEBUG'] = True
app.config['ASSETS_DEBUG'] = True
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.jinja_env.auto_reload = True
app.config['TEMPLATES_AUTO_RELOAD'] = True
from .util import assets
from app import views
