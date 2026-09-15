from pymongo import MongoClient
import bcrypt

emails = [
    "ratheeshrajan1981@gmail.com",
    "bindhutrsngce@gmail.com",
    "beetanarayanan@sngce.ac.in",
    "smitha@sngce.ac.in",
    "eldhobabu@sngce.ac.in",
    "minimolepk@sngce.ac.in",
    "reenans@sngce.ac.in",
    "laluvs@sngce.ac.in",
    "shanmughantt@sngce.ac.in",
    "shinukprabhakaran@sngce.ac.in",
    "shylatn@sngce.ac.in",
    "saralama@sngce.ac.in",
    "tmsreedevi@sngce.ac.in",
    "sukumaranvg@sngce.ac.in",
    "manojnp@sngce.ac.in",
    "sreejithps@sngce.ac.in",
    "aravindakshankn@sngce.ac.in",
    "ananthuramachandran@sngce.ac.in"
]

mongo_url = "mongodb://Adisankar:CB1E9r7mjPV5YLpq@ac-irtrr2z-shard-00-00.3nnx8jj.mongodb.net:27017,ac-irtrr2z-shard-00-01.3nnx8jj.mongodb.net:27017,ac-irtrr2z-shard-00-02.3nnx8jj.mongodb.net:27017/?ssl=true&replicaSet=atlas-czuifj-shard-0&authSource=admin&appName=Cluster0"

client = MongoClient(mongo_url)
db = client.get_database("test")
users_collection = db.users

password = b"Sngce@123"
hashed = bcrypt.hashpw(password, bcrypt.gensalt()).decode('utf-8')

res = users_collection.update_many(
    {"email": {"$in": emails}},
    {"$set": {"password": hashed}}
)

print(f"Updated {res.modified_count} users' passwords!")
