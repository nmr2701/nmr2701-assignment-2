.PHONY: install run

install:
	npm install
	
	python3 -m venv venv
	
	venv/bin/pip install -r requirements.txt

run:
	venv/bin/python app.py &
	npm run start