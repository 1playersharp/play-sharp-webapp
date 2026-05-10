from fastapi import FastAPI
from mangum import Mangum

from routes import api_router

app = FastAPI(title="PlaySharp API", version="1.2.0")
app.include_router(api_router)

handler = Mangum(app)