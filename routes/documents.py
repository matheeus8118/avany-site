import re

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, UserDocument
from utils.validators import validate_cpf, validate_cnpj

documents_bp = Blueprint('documents', __name__, url_prefix='/api/auth')


@documents_bp.route('/documents', methods=['POST'])
@jwt_required()
def upload_document():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        data = request.get_json()

        if not data or not data.get('document_type') or not data.get('document_number'):
            return jsonify({'error': 'Tipo e número do documento são obrigatórios'}), 400

        doc_type = data['document_type'].upper()
        doc_number = re.sub(r'\D', '', data['document_number'])

        if doc_type == 'CPF':
            if not validate_cpf(doc_number):
                return jsonify({'error': 'CPF inválido'}), 400
        elif doc_type == 'CNPJ':
            if not validate_cnpj(doc_number):
                return jsonify({'error': 'CNPJ inválido'}), 400
        else:
            return jsonify({'error': 'Tipo de documento inválido'}), 400

        existing = UserDocument.query.filter_by(document_number=doc_number).first()
        if existing and existing.user_id != user_id:
            return jsonify({'error': 'Este documento já está cadastrado'}), 409

        doc = UserDocument.query.filter_by(user_id=user_id, document_type=doc_type).first()
        if not doc:
            doc = UserDocument(user_id=user_id, document_type=doc_type)

        doc.document_number = doc_number
        doc.document_name = data.get('document_name')
        doc.status = 'pending'

        db.session.add(doc)
        db.session.commit()

        return jsonify({
            'message': 'Documento enviado com sucesso. Aguardando verificação.',
            'document': doc.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@documents_bp.route('/documents', methods=['GET'])
@jwt_required()
def get_documents():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        documents = UserDocument.query.filter_by(user_id=user_id).all()

        return jsonify({
            'documents': [doc.to_dict() for doc in documents]
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
