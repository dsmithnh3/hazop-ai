"""The original saved topology stays unchanged through the viewer API."""
import json

from hazop.s1_dim.app import app
from hazop.s1_dim import geometry_workbench as workbench


def test_reference_sheets_preserve_saved_geometry():
    client = app.test_client()
    sheets = client.get('/geometry/api/sheets').get_json()
    assert [s['page'] for s in sheets] == list(range(4, 13))
    for sheet in sheets:
        page = sheet['page']
        expected = json.loads((workbench.output_dir() / f'topology_page{page}.json').read_text())
        response = client.get(f'/geometry/api/sheets/{page}')
        assert response.status_code == 200
        assert response.json['topology'] == expected
        download = client.get(f'/geometry/download/{page}')
        assert json.loads(download.data) == expected
        assert 'attachment' in download.headers['Content-Disposition']


def test_missing_source_keeps_geometry_available(monkeypatch, tmp_path):
    monkeypatch.setenv('HAZOP_GEOMETRY_PDF', str(tmp_path / 'missing.pdf'))
    client = app.test_client()
    result = client.get('/geometry/api/sheets/4').json
    assert result['source'] is None
    assert result['width'] > 0 and result['height'] > 0
    assert result['topology']['nodes']
    assert client.get('/geometry/api/sheets/4/source.svg').status_code == 404


def test_only_process_sheets_are_exposed():
    client = app.test_client()
    for page in [0, 1, 3, 13, 999]:
        assert client.get(f'/geometry/api/sheets/{page}').status_code == 404
        assert client.get(f'/geometry/download/{page}').status_code == 404
    assert client.get('/geometry').status_code == 200
    for asset in ['geometry.css', 'geometry.js']:
        assert client.get('/geometry/static/' + asset).status_code == 200
