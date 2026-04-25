from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = 'users'

    id            = db.Column(db.Integer, primary_key=True)
    email         = db.Column(db.String(120), unique=True, nullable=False)
    name          = db.Column(db.String(100), nullable=False)
    phone         = db.Column(db.String(20))
    password_hash = db.Column(db.String(256))
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)

    documents = db.relationship('UserDocument', backref='user', lazy=True, cascade='all, delete-orphan')
    addresses = db.relationship('Address',      backref='user', lazy=True, cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id':         self.id,
            'email':      self.email,
            'name':       self.name,
            'phone':      self.phone,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class UserDocument(db.Model):
    __tablename__ = 'user_documents'

    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    type       = db.Column(db.String(20))   # 'cpf' | 'cnpj'
    number     = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {'id': self.id, 'type': self.type, 'number': self.number}


class Address(db.Model):
    __tablename__ = 'addresses'

    id          = db.Column(db.Integer, primary_key=True)
    user_id     = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    street      = db.Column(db.String(200))
    number      = db.Column(db.String(20))
    complement  = db.Column(db.String(100))
    city        = db.Column(db.String(100))
    state       = db.Column(db.String(2))
    zip_code    = db.Column(db.String(9))
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':         self.id,
            'street':     self.street,
            'number':     self.number,
            'complement': self.complement,
            'city':       self.city,
            'state':      self.state,
            'zip_code':   self.zip_code,
        }


class Product(db.Model):
    __tablename__ = 'products'

    id             = db.Column(db.String(50), primary_key=True)
    name           = db.Column(db.String(200), nullable=False)
    emoji          = db.Column(db.String(10),  default='📦')
    category       = db.Column(db.String(100), default='')
    cost_price     = db.Column(db.Float,       default=0.0)
    profit_margin  = db.Column(db.Float,       default=50.0)
    client_price   = db.Column(db.Float,       default=0.0)
    image_url      = db.Column(db.String(500), default='')
    free_shipping  = db.Column(db.Boolean,     default=False)
    active         = db.Column(db.Boolean,     default=True)
    stars          = db.Column(db.Float,       default=5.0)
    reviews        = db.Column(db.Integer,     default=0)
    promo_active   = db.Column(db.Boolean,     default=False)
    promo_discount = db.Column(db.Integer,     default=0)
    promo_label    = db.Column(db.String(100), default='')
    promo_end_date = db.Column(db.String(20),  default='')
    created_at     = db.Column(db.DateTime,    default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':           self.id,
            'name':         self.name,
            'emoji':        self.emoji,
            'category':     self.category,
            'costPrice':    self.cost_price,
            'profitMargin': self.profit_margin,
            'clientPrice':  self.client_price,
            'imageUrl':     self.image_url,
            'freeShipping': self.free_shipping,
            'active':       self.active,
            'stars':        self.stars,
            'reviews':      self.reviews,
            'promotion': {
                'active':          self.promo_active,
                'discountPercent': self.promo_discount,
                'label':           self.promo_label,
                'endDate':         self.promo_end_date,
            },
        }
