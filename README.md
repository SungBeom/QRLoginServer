# QRLoginServer
QR web server with html and js  
QR API server with nodejs


## Requirement
### For all server
- Ubuntu 18.04.3 LTS
### For web server
- nodejs v8.10.0
- npm v3.5.2
### For API server
- nginx v1.14.0
### For DB server
- mysql v5.7.28


## Running Server
1. [**Web server**](https://wiki.daumkakao.com/display/KAKAOAPI/Web+server)
2. [**API server**](https://wiki.daumkakao.com/display/KAKAOAPI/API+server)
3. [**DB server**](https://wiki.daumkakao.com/display/KAKAOAPI/DB+server)


## Running Tests(in macOS)
1. Clone the git repository and change the current folder.
```
git clone https://github.com/SungBeom/QRLoginServer.git
cd QRLoginServer
```
2. Install node and npm with brew.
```
brew install node
```
3. Make sure node and npm are installed.
```
node -v
npm -v
```
4. Install node_modules.
```
npm install
```
5. Get a Kakao access token.
To test Kakao login, you will need a Kakao Access Token.  
Go to the [**Kakao developer site**](https://developers.kakao.com/docs/restapi/tool), log in to 'developers-sample' with your Kakao account, and get an access token.  

6. Make env file for test.  
In place of "kakao access token", you need to put the token issued above.
```
node src/test {kakao access token}
```

7. Test a three-way login.
- Sign up & Login
```
mocha test/login
```
- QR Login
```
mocha test/qrlogin
```
- Kakao Login
```
mocha test/kakaologin
```
