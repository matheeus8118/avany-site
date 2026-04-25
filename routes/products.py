from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from models import db, Product, User
from datetime import datetime

products_bp = Blueprint('products', __name__, url_prefix='/api/products')

ADMIN_EMAIL = 'matheeus998@gmail.com'


def _require_admin():
    """Returns (user, error_response). error_response is None when user is admin."""
    try:
        verify_jwt_in_request()
        user = User.query.get(get_jwt_identity())
        if user and user.email == ADMIN_EMAIL:
            return user, None
    except Exception:
        pass
    return None, (jsonify({'error': 'Acesso negado'}), 403)


# ── GET all products (public) ────────────────────────────────────
@products_bp.route('', methods=['GET'])
def get_products():
    products = Product.query.order_by(Product.created_at.desc()).all()
    return jsonify([p.to_dict() for p in products])


# ── POST create product (admin) ──────────────────────────────────
@products_bp.route('', methods=['POST'])
@jwt_required()
def create_product():
    _, err = _require_admin()
    if err:
        return err

    data = request.get_json()
    if not data or not data.get('name'):
        return jsonify({'error': 'Nome é obrigatório'}), 400

    promo = data.get('promotion', {})
    uid   = 'prod-' + str(int(datetime.utcnow().timestamp() * 1000))

    product = Product(
        id            = uid,
        name          = data['name'],
        emoji         = data.get('emoji', '📦'),
        category      = data.get('category', ''),
        cost_price    = data.get('costPrice', 0),
        profit_margin = data.get('profitMargin', 50),
        client_price  = data.get('clientPrice', 0),
        image_url     = data.get('imageUrl', ''),
        free_shipping = data.get('freeShipping', False),
        active        = data.get('active', True),
        stars         = data.get('stars', 5),
        reviews       = data.get('reviews', 0),
        promo_active   = promo.get('active', False),
        promo_discount = promo.get('discountPercent', 0),
        promo_label    = promo.get('label', ''),
        promo_end_date = promo.get('endDate', ''),
    )
    db.session.add(product)
    db.session.commit()
    return jsonify(product.to_dict()), 201


# ── PUT update product (admin) ───────────────────────────────────
@products_bp.route('/<product_id>', methods=['PUT'])
@jwt_required()
def update_product(product_id):
    _, err = _require_admin()
    if err:
        return err

    product = Product.query.get(product_id)
    if not product:
        return jsonify({'error': 'Produto não encontrado'}), 404

    data  = request.get_json()
    promo = data.get('promotion', {})

    if 'name'         in data:  product.name          = data['name']
    if 'emoji'        in data:  product.emoji         = data['emoji']
    if 'category'     in data:  product.category      = data['category']
    if 'costPrice'    in data:  product.cost_price    = data['costPrice']
    if 'profitMargin' in data:  product.profit_margin = data['profitMargin']
    if 'clientPrice'  in data:  product.client_price  = data['clientPrice']
    if 'imageUrl'     in data:  product.image_url     = data['imageUrl']
    if 'freeShipping' in data:  product.free_shipping = data['freeShipping']
    if 'active'       in data:  product.active        = data['active']
    if 'stars'        in data:  product.stars         = data['stars']
    if 'reviews'      in data:  product.reviews       = data['reviews']

    if promo:
        if 'active'          in promo: product.promo_active   = promo['active']
        if 'discountPercent' in promo: product.promo_discount = promo['discountPercent']
        if 'label'           in promo: product.promo_label    = promo['label']
        if 'endDate'         in promo: product.promo_end_date = promo['endDate']

    db.session.commit()
    return jsonify(product.to_dict())


# ── DELETE product (admin) ───────────────────────────────────────
@products_bp.route('/<product_id>', methods=['DELETE'])
@jwt_required()
def delete_product(product_id):
    _, err = _require_admin()
    if err:
        return err

    product = Product.query.get(product_id)
    if not product:
        return jsonify({'error': 'Produto não encontrado'}), 404

    db.session.delete(product)
    db.session.commit()
    return jsonify({'message': 'Produto removido'})
