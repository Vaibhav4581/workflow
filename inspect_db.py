from pymongo import MongoClient
import os

mongo_url = "mongodb://Adisankar:CB1E9r7mjPV5YLpq@ac-irtrr2z-shard-00-00.3nnx8jj.mongodb.net:27017,ac-irtrr2z-shard-00-01.3nnx8jj.mongodb.net:27017,ac-irtrr2z-shard-00-02.3nnx8jj.mongodb.net:27017/?ssl=true&replicaSet=atlas-czuifj-shard-0&authSource=admin&appName=Cluster0"

client = MongoClient(mongo_url)
db = client.get_database("test") # Let's try "test" or check db names
print("Databases:", client.list_database_names())
