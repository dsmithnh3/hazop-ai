"""Read-only workbench for the original vector-geometry extraction results."""
import io
import json
import os
from pathlib import Path

import fitz
from flask import Blueprint, abort, jsonify, send_file

bp = Blueprint('geometry', __name__, static_folder='static',
               static_url_path='/geometry/static')
ROOT = Path(__file__).resolve().parents[3]


def output_dir():
    return Path(os.environ.get('HAZOP_GEOMETRY_OUTPUT', ROOT / 'data/l1_output'))


def source_path():
    return Path(os.environ.get('HAZOP_GEOMETRY_PDF',
                ROOT.parent / 'pidgraph/2401单元工艺管道及仪表流程图.pdf'))


def topology(page):
    # The original reference's process sheets are 4-12. Legend detections are
    # deliberately excluded from this reference result browser.
    if page not in range(4, 13):
        abort(404)
    path = output_dir() / f'topology_page{page}.json'
    if not path.is_file():
        abort(404)
    return json.loads(path.read_text())


@bp.get('/geometry')
def workbench():
    return bp.send_static_file('geometry.html')


@bp.get('/geometry/api/sheets')
def sheets():
    result = []
    for page in range(4, 13):
        if (output_dir() / f'topology_page{page}.json').is_file():
            data = topology(page)
            result.append({'page': page, 'nodes': len(data['nodes']),
                           'edges': len(data['edges'])})
    return jsonify(result)


@bp.get('/geometry/api/sheets/<int:page>')
def sheet(page):
    data = topology(page)
    pdf = source_path()
    if pdf.is_file():
        with fitz.open(pdf) as doc:
            if page > len(doc):
                abort(404)
            rect = doc[page - 1].rect
            width, height = rect.width, rect.height
        source = f'/geometry/api/sheets/{page}/source.svg'
    else:
        points = [n['xy'] for n in data['nodes'] if n.get('xy')]
        points += [pt for edge in data['edges'] for pt in edge.get('points', [])]
        width = max((p[0] for p in points), default=1000) + 50
        height = max((p[1] for p in points), default=700) + 50
        source = None
    return jsonify(topology=data, width=width, height=height, source=source)


@bp.get('/geometry/api/sheets/<int:page>/source.svg')
def source(page):
    topology(page)
    if not source_path().is_file():
        abort(404)
    with fitz.open(source_path()) as doc:
        if page > len(doc):
            abort(404)
        svg = doc[page - 1].get_svg_image(text_as_path=True)
    return send_file(io.BytesIO(svg.encode()), mimetype='image/svg+xml')


@bp.get('/geometry/download/<int:page>')
def download(page):
    topology(page)
    return send_file(output_dir() / f'topology_page{page}.json', as_attachment=True)
