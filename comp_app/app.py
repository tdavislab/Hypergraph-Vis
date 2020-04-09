#!/usr/bin/env python

from flask import Flask, render_template

app = Flask(__name__)


@app.route('/')
def pipeline_render():
    return render_template('pipeline.html')


if __name__ == '__main__':
    app.run(debug=True)
