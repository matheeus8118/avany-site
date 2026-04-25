from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Address

addresses_bp = Blueprint('addresses', __name__, url_prefix='/api/auth')


@addresses_bp.route('/addresses', methods=['POST'])
@jwt_required()
def create_address():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        data = request.get_json()

        required_fields = ['street', 'number', 'city', 'state', 'zip_code']
        if not all(data.get(field) for field in required_fields):
            return jsonify({'error': 'Campos obrigatórios: rua, número, cidade, estado, CEP'}), 400

        address = Address(
            user_id=user_id,
            street=data['street'],
            number=data['number'],
            complement=data.get('complement'),
            city=data['city'],
            state=data['state'].upper(),
            zip_code=data['zip_code'],
            is_default=data.get('is_default', False)
        )

        if address.is_default:
            Address.query.filter_by(user_id=user_id, is_default=True).update({'is_default': False})

        db.session.add(address)
        db.session.commit()

        return jsonify({
            'message': 'Endereço criado com sucesso',
            'address': address.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@addresses_bp.route('/addresses', methods=['GET'])
@jwt_required()
def get_addresses():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        addresses = Address.query.filter_by(user_id=user_id).all()

        return jsonify({
            'addresses': [addr.to_dict() for addr in addresses]
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@addresses_bp.route('/addresses/<int:address_id>', methods=['PUT'])
@jwt_required()
def update_address(address_id):
    try:
        user_id = get_jwt_identity()
        address = Address.query.get(address_id)

        if not address or address.user_id != user_id:
            return jsonify({'error': 'Endereço não encontrado'}), 404

        data = request.get_json()

        if 'street' in data:
            address.street = data['street']
        if 'number' in data:
            address.number = data['number']
        if 'complement' in data:
            address.complement = data['complement']
        if 'city' in data:
            address.city = data['city']
        if 'state' in data:
            address.state = data['state'].upper()
        if 'zip_code' in data:
            address.zip_code = data['zip_code']
        if 'is_default' in data:
            if data['is_default']:
                Address.query.filter_by(user_id=user_id, is_default=True).update({'is_default': False})
            address.is_default = data['is_default']

        db.session.commit()

        return jsonify({
            'message': 'Endereço atualizado com sucesso',
            'address': address.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@addresses_bp.route('/addresses/<int:address_id>', methods=['DELETE'])
@jwt_required()
def delete_address(address_id):
    try:
        user_id = get_jwt_identity()
        address = Address.query.get(address_id)

        if not address or address.user_id != user_id:
            return jsonify({'error': 'Endereço não encontrado'}), 404

        db.session.delete(address)
        db.session.commit()

        return jsonify({'message': 'Endereço deletado com sucesso'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
