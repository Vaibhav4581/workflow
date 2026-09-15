from docx import Document
from pymongo import MongoClient

mongo_url = "mongodb://Adisankar:CB1E9r7mjPV5YLpq@ac-irtrr2z-shard-00-00.3nnx8jj.mongodb.net:27017,ac-irtrr2z-shard-00-01.3nnx8jj.mongodb.net:27017,ac-irtrr2z-shard-00-02.3nnx8jj.mongodb.net:27017/?ssl=true&replicaSet=atlas-czuifj-shard-0&authSource=admin&appName=Cluster0"

client = MongoClient(mongo_url)
db = client.get_database("test")
users_collection = db.users

db_users = list(users_collection.find({}, {"email": 1, "name": 1}))
db_emails = {u.get("email", "").strip().lower() for u in db_users if u.get("email")}
db_names = {u.get("name", "").strip().lower() for u in db_users if u.get("name")}

doc = Document('SNGCE Staff Directory.docx')
missing_people = []
seen_emails = set()

for table in doc.tables:
    header_row = table.rows[0]
    email_idx = -1
    name_idx = -1
    for idx, cell in enumerate(header_row.cells):
        text = cell.text.strip().lower()
        if "email" in text:
            email_idx = idx
        if "name" in text and "faculty" not in text:
            name_idx = idx
            
    if name_idx == -1:
        for idx, cell in enumerate(header_row.cells):
            text = cell.text.strip().lower()
            if "name" in text:
                name_idx = idx
                
    if email_idx == -1 or name_idx == -1:
        continue
        
    for row in table.rows[1:]:
        cells = row.cells
        if len(cells) > max(email_idx, name_idx):
            name = cells[name_idx].text.replace('\n', '').strip()
            email = cells[email_idx].text.replace('\n', '').strip().lower()
            
            if not name and not email:
                continue
                
            if email in seen_emails:
                continue
            if email:
                seen_emails.add(email)
                
            found = False
            if email and email in db_emails:
                found = True
            elif name and name.lower() in db_names:
                found = True
                
            if not found:
                missing_people.append({"name": name, "email": email})

print(f"Total missing: {len(missing_people)}")
for p in missing_people:
    print(f"{p['name']} - {p['email']}")
