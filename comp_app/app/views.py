from flask import render_template, Blueprint

views = Blueprint('views', __name__)


@views.route('/')
def pipeline_render():
    return render_template('pipeline.html')
