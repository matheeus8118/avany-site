from flask import Flask
from flask_jwt_extended import JWTManager
from models import db, User, Product
from routes import auth_bp, documents_bp, addresses_bp, products_bp
from datetime import datetime


def create_app():
    app = Flask(__name__)

    app.config['SQLALCHEMY_DATABASE_URI']        = 'sqlite:///app.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY']                 = 'avany-secret-2026-change-in-prod'

    db.init_app(app)
    JWTManager(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(documents_bp)
    app.register_blueprint(addresses_bp)
    app.register_blueprint(products_bp)

    # ── CORS (allow file:// and localhost origins) ───────────────
    @app.after_request
    def add_cors(response):
        origin = '*'
        response.headers['Access-Control-Allow-Origin']  = origin
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        return response

    @app.before_request
    def handle_options():
        from flask import request, Response
        if request.method == 'OPTIONS':
            res = Response()
            res.headers['Access-Control-Allow-Origin']  = '*'
            res.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
            res.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            return res

    # ── DB init + seed ───────────────────────────────────────────
    with app.app_context():
        db.create_all()
        _seed_admin()
        _seed_products()

    return app


ADMIN_EMAIL = 'matheeus998@gmail.com'
ADMIN_PW    = 'avany2026'

SEED_PRODUCTS = [
    {'id': 'seed-1',  'name': 'Geladeira Frost Free 480L Inox',       'emoji': '❄️',  'category': 'Eletrodomésticos', 'costPrice': 2200,  'profitMargin': 41, 'clientPrice': 3099.90, 'freeShipping': True,  'stars': 5, 'reviews': 248, 'promotion': {'active': True,  'discountPercent': 28, 'label': '-28% OFF', 'endDate': ''}},
    {'id': 'seed-2',  'name': 'Smart TV LED 55" 4K UHD Wi-Fi',        'emoji': '🖥️',  'category': 'TV e Vídeo',        'costPrice': 1850,  'profitMargin': 22, 'clientPrice': 2249.90, 'freeShipping': True,  'stars': 4, 'reviews': 193, 'promotion': {'active': True,  'discountPercent': 22, 'label': '-22% OFF', 'endDate': ''}},
    {'id': 'seed-3',  'name': 'Air Fryer Digital 5,5L 1700W',          'emoji': '🍟',  'category': 'Eletrodomésticos', 'costPrice': 250,   'profitMargin': 60, 'clientPrice': 399.90,  'freeShipping': False, 'stars': 5, 'reviews': 512, 'promotion': {'active': False, 'discountPercent': 0,  'label': '',         'endDate': ''}},
    {'id': 'seed-4',  'name': 'Notebook Intel i5 8GB SSD 512GB',       'emoji': '💻',  'category': 'Informática',       'costPrice': 2700,  'profitMargin': 22, 'clientPrice': 3299.00, 'freeShipping': True,  'stars': 5, 'reviews': 87,  'promotion': {'active': True,  'discountPercent': 15, 'label': '-15% OFF', 'endDate': ''}},
    {'id': 'seed-5',  'name': 'Máquina de Lavar 11kg Inverter',        'emoji': '🌀',  'category': 'Eletrodomésticos', 'costPrice': 1300,  'profitMargin': 38, 'clientPrice': 1799.90, 'freeShipping': True,  'stars': 4, 'reviews': 341, 'promotion': {'active': False, 'discountPercent': 0,  'label': '',         'endDate': ''}},
    {'id': 'seed-6',  'name': 'Smartphone 128GB 5G Câmera 50MP',       'emoji': '📱',  'category': 'Celulares',         'costPrice': 1200,  'profitMargin': 27, 'clientPrice': 1529.10, 'freeShipping': False, 'stars': 5, 'reviews': 420, 'promotion': {'active': True,  'discountPercent': 10, 'label': '-10% OFF', 'endDate': ''}},
    {'id': 'seed-7',  'name': 'Fone Bluetooth ANC 30h bateria',        'emoji': '🎧',  'category': 'Áudio',             'costPrice': 160,   'profitMargin': 56, 'clientPrice': 249.90,  'freeShipping': False, 'stars': 5, 'reviews': 689, 'promotion': {'active': False, 'discountPercent': 0,  'label': '',         'endDate': ''}},
    {'id': 'seed-8',  'name': 'Sofá Retrátil 3 Lugares Veludo',        'emoji': '🛋️',  'category': 'Móveis',            'costPrice': 1400,  'profitMargin': 40, 'clientPrice': 1959.30, 'freeShipping': True,  'stars': 5, 'reviews': 176, 'promotion': {'active': True,  'discountPercent': 30, 'label': '-30% OFF', 'endDate': ''}},
    {'id': 'seed-9',  'name': 'Fogão 5 Bocas Inox Auto Acendimento',   'emoji': '🍳',  'category': 'Eletrodomésticos', 'costPrice': 900,   'profitMargin': 44, 'clientPrice': 1299.90, 'freeShipping': False, 'stars': 4, 'reviews': 203, 'promotion': {'active': False, 'discountPercent': 0,  'label': '',         'endDate': ''}},
    {'id': 'seed-10', 'name': 'PS5 Console Digital + 2 Jogos',         'emoji': '🎮',  'category': 'Games',             'costPrice': 3100,  'profitMargin': 19, 'clientPrice': 3689.00, 'freeShipping': True,  'stars': 5, 'reviews': 532, 'promotion': {'active': True,  'discountPercent': 18, 'label': '-18% OFF', 'endDate': ''}},
    {'id': 'seed-11', 'name': 'Smartwatch GPS Monitor Cardíaco',        'emoji': '⌚',  'category': 'Eletrônicos',       'costPrice': 500,   'profitMargin': 35, 'clientPrice': 674.25,  'freeShipping': False, 'stars': 5, 'reviews': 317, 'promotion': {'active': True,  'discountPercent': 25, 'label': '-25% OFF', 'endDate': ''}},
    {'id': 'seed-12', 'name': 'Cafeteira Espresso 19 Bar Inox',         'emoji': '☕',  'category': 'Eletrodomésticos', 'costPrice': 400,   'profitMargin': 50, 'clientPrice': 599.90,  'freeShipping': False, 'stars': 5, 'reviews': 445, 'promotion': {'active': False, 'discountPercent': 0,  'label': '',         'endDate': ''}},
    {'id': 'seed-13', 'name': 'Cama Box Casal Queen Size Ortobom',      'emoji': '🛏️',  'category': 'Móveis',            'costPrice': 1500,  'profitMargin': 39, 'clientPrice': 2079.35, 'freeShipping': True,  'stars': 5, 'reviews': 228, 'promotion': {'active': True,  'discountPercent': 35, 'label': '-35% OFF', 'endDate': ''}},
    {'id': 'seed-14', 'name': 'Cadeira Gamer Ergonômica Reclinável',    'emoji': '🪑',  'category': 'Móveis',            'costPrice': 600,   'profitMargin': 50, 'clientPrice': 899.90,  'freeShipping': False, 'stars': 4, 'reviews': 156, 'promotion': {'active': False, 'discountPercent': 0,  'label': '',         'endDate': ''}},
    {'id': 'seed-15', 'name': 'Robô Aspirador Wi-Fi Mapeamento',        'emoji': '🧹',  'category': 'Eletrodomésticos', 'costPrice': 850,   'profitMargin': 41, 'clientPrice': 1199.20, 'freeShipping': True,  'stars': 4, 'reviews': 164, 'promotion': {'active': True,  'discountPercent': 20, 'label': '-20% OFF', 'endDate': ''}},
]


def _seed_admin():
    if not User.query.filter_by(email=ADMIN_EMAIL).first():
        admin = User(email=ADMIN_EMAIL, name='Admin Avany')
        admin.set_password(ADMIN_PW)
        db.session.add(admin)
        db.session.commit()


def _seed_products():
    if Product.query.count() > 0:
        return
    for s in SEED_PRODUCTS:
        promo = s.get('promotion', {})
        p = Product(
            id            = s['id'],
            name          = s['name'],
            emoji         = s.get('emoji', '📦'),
            category      = s.get('category', ''),
            cost_price    = s.get('costPrice', 0),
            profit_margin = s.get('profitMargin', 50),
            client_price  = s.get('clientPrice', 0),
            image_url     = s.get('imageUrl', ''),
            free_shipping = s.get('freeShipping', False),
            active        = s.get('active', True),
            stars         = s.get('stars', 5),
            reviews       = s.get('reviews', 0),
            promo_active   = promo.get('active', False),
            promo_discount = promo.get('discountPercent', 0),
            promo_label    = promo.get('label', ''),
            promo_end_date = promo.get('endDate', ''),
            created_at    = datetime.utcnow(),
        )
        db.session.add(p)
    db.session.commit()


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)
