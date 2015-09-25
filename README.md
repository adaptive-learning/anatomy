# anatomy
An intelligent application for practicing human anatomy. 

## Development

### Initial setup

Install [pip](https://pip.pypa.io/en/latest/installing/)

Install [virtualenvwrapper](http://virtualenvwrapper.readthedocs.org/en/latest/install.html)

	$ pip install virtualenvwrapper

Setup your local virtual environment:

	mkvirtualenv anatomy
	workon anatomy

Install python dependencies

```
cd <path_to_your_local_git_repo>
pip install -r requirements.txt
```
It might require to install (with yum, apt-get or whatever) [python developer package](http://stackoverflow.com/questions/6230444/how-to-install-python-developer-package) and PostgreSQL developer package (On Ubuntu it is [libpq-dev](https://packages.debian.org/sid/libpq-dev))

Install client dependencies

```
cd anatomy
npm install
grunt
```

### When developing

Run the server on localhost:8003
```
cd <path_to_your_local_git_repo>
workon anatomy
./manage.py runserver 8003
```
In order to see the changes when editing  client files (e.g. `*.sass` and `*.js`) you need to run also
```
cd  anatomy
grunt watch
```

### Manage translations
To update translations on [transifex.com/adaptive-learning/anatomcz](https://www.transifex.com/adaptive-learning/anatomcz) set up your [~/.transifexrc](http://docs.transifex.com/client/config/#transifexrc) and use [Transifex client](http://docs.transifex.com/client/)
```
tx push -s
```
To pull translated stings
```
tx pull -a
```
