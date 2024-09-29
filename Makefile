.PHONY: install run clean

VENV_DIR := venv

install: $(VENV_DIR)/bin/activate
	npm install
	$(VENV_DIR)/bin/pip install -r requirements.txt

$(VENV_DIR)/bin/activate:
	python3 -m venv $(VENV_DIR)
	$(VENV_DIR)/bin/pip install --upgrade pip

run: $(VENV_DIR)/bin/activate
	npm run start &
	$(VENV_DIR)/bin/python app.py

clean:
	rm -rf $(VENV_DIR)
	rm -rf node_modules