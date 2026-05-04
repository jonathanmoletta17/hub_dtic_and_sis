from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.routers.domain_formcreator import (
    _build_form_answer_input,
    _get_required_file_question_labels,
    _parse_file_question_ids,
    _sanitize_formcreator_filename,
)


def test_build_form_answer_input_serializes_answers_for_glpi() -> None:
    payload = _build_form_answer_input(
        7,
        {
            "10": "texto",
            "11": 3,
            "12": ["a", "b"],
            "13": None,
            "formcreator_field_14": {"x": 1},
        },
    )

    assert payload == {
        "plugin_formcreator_forms_id": 7,
        "requesttypes_id": 1,
        "formcreator_field_10": "texto",
        "formcreator_field_11": "3",
        "formcreator_field_12": '["a", "b"]',
        "formcreator_field_14": '{"x": 1}',
    }


def test_parse_file_question_ids_requires_alignment_with_files() -> None:
    assert _parse_file_question_ids("[46, 88]", 2) == [46, 88]

    with pytest.raises(HTTPException) as exc:
        _parse_file_question_ids("[46]", 2)

    assert exc.value.status_code == 400


def test_sanitize_formcreator_filename_strips_paths_and_unsafe_chars() -> None:
    assert _sanitize_formcreator_filename("../../foto ótima.png") == "foto _tima.png"


def test_required_file_question_labels_are_explicitly_identified() -> None:
    assert _get_required_file_question_labels(
        [46, 88],
        {
            46: {"name": "ENVIAR ARQUIVO COM OS DADOS DE NOVO USUÁRIO", "required": 1},
            88: {"name": "ANEXO", "required": 0},
        },
    ) == ["ENVIAR ARQUIVO COM OS DADOS DE NOVO USUÁRIO"]
