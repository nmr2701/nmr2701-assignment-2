# Makefile for setting up and running the web application

.PHONY: install run

install:
	npm install
	pip install -r requirements.txt

run:
	npm start &
	python app.py