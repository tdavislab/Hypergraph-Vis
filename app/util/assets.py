from flask import Flask
from flask_assets import Bundle, Environment
from .. import app

bundles = {
    'js': Bundle(
        'js/d3.v5.js',
        'js/jquery-3.4.1.min.js',
        'js/bootstrap.min.js',
        'js/hypergraph.js',
        'js/simplified_hypergraph.js',
        'js/linegraph.js',
        'js/barcode.js',
        'js/script.js',
        output='gen/script.js'
        ),

        'css': Bundle(
        'css/colors.css',
        'css/bootstrap.css',
        'css/layout-bootstrap.css',
        output='gen/styles.css'
        )
}

assets = Environment(app)

assets.register(bundles)