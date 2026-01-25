from flask import Flask


def create_app() -> Flask:
    """Application factory for the SiK Radio Configurator."""
    app = Flask(
        __name__,
        static_folder="static",
        template_folder="templates",
    )

    from .routes import bp as main_bp

    app.register_blueprint(main_bp)

    return app
