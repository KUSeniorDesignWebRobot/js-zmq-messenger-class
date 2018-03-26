const EventEmitter = require('events');

class Messenger extends EventEmitter {
    constructor(port) {
        super();
        let zmq = require('zeromq'),
        z85 = require('z85'),
        debug = require('debug')('zmq-zap:examples:curve');
        console.log(z85.version);
        while(true);
        // port = 'tcp://127.0.0.1:5555';
        
        let serverKeypair = zmq.curveKeypair();
        let  clientKeypair = zmq.curveKeypair();
        // var serverPublicKey = serverKeypair.public,
        // 	serverPrivateKey = serverKeypair.secret,
        // 	clientPublicKey = clientKeypair.public,
        // 	clientPrivateKey = clientKeypair.secret;

        // Placeholder for actual per-session key-generation (as seen above, but need to work out public key trading first with robot_client.py)
        let serverPublicKey = "N@7tEO8coes2iv=YB0+ZdOelzh<b%yn$F6<L^iwQ",
            serverPrivateKey = "q{>-q6JR!AkF}}RJnu+v3gLq&n7tXQ(UikHwWji[",
            clientPublicKey = ".V:v04@zyE(ph9Hrx%d/HpVqg8WWkp(.>v7{/pMm",
            clientPrivateKey = "}6bD1wzt}sn=l5AfMMiN>%:CkkPCDt2aL*j:<Gd+";
        // Requires for ZAP handler
        let zmqzap = require('zmq-zap'),
            ZAP = zmqzap.ZAP,
            CurveMechanism = zmqzap.CurveMechanism;

        // Create a new ZAP Handler
        let zap = new ZAP();

        // Tell it to use the CURVE mechanism for authentication
        zap.use(new CurveMechanism(function(data, callback) {
            console.log('Authenticating %s', JSON.stringify(data, true, 2));
            if ((data.domain == 'test') && (data.address == "127.0.0.1")) {
                if (data.publickey == clientPublicKey) callback(null, true);
                else callback(null, false);
            }
            else callback(null, false);
        }));

        // Setup ZeroMQ ZAP socket
        // We'll use a router so that we can handle multiple requests at once
        let zapSocket = zmq.socket('router');
        zapSocket.on('message', function() {
            // When we get a message, send it through to the ZAP handler
            zap.authenticate(arguments, function(err, response) {
                if (err) console.error('Error:', err);
                
                // Always send the response if the handler gives us one in the callback.
                // This should be done even if there is an error so that we don't block any sockets.
                if (response) zapSocket.send(response);
            });
        });

        // The socket for the ZAP handler should be bound before creating any sockets that will use it.
        // We'll use bindSync to make sure that the bind completes before we do anything else.
        zapSocket.bindSync('inproc://zeromq.zap.01');

        // Setup a rep "server"
        this.server = zmq.socket('rep');
        this.server.identity = "rep-socket";

        // Tell the socket that we want it to be a CURVE "server"
        this.server.curve_server = 1;
        // Set the private key for the server so that it can decrypt messages (it does not need its public key)
        this.server.curve_secretkey = serverPrivateKey;
        // Set a domain, but this is optional
        this.server.zap_domain = "test";

        this.server.curve_secretkey = serverPrivateKey;
        this.server.curve_publickey = serverPublicKey;
        this.server.bind(port);
        const that = this;
        this.server.on('message', function(data) {
            that.emit('message', data);
        });

    }

    send(data) {
        // console.log(typeof this);
        this.server.send(data);
    }
}





// EXAMPLE COMMAND MESSAGE:
var cM = {
    "message_id": "067c8c59-710a-4c15-8265-b7f1e49b828c",
    "message_type": "command",
    "robot_id": "067c8c59-710a-4c15-8265-b7f1e49b828c",
    "timestamp": 1509748526.3482552,
    "configuration_id": "067c8c59-710a-4c15-8265-b7f1e49b828c",
    "session_id": "067c8c59-710a-4c15-8265-b7f1e49b828c",
    "instructions": [
        {
        "value": 0.10666666666666667,
        "actuator_id": "067c8c59-710a-4c15-8265-b7f1e49b828c",
        "ttl": 1.412,
        "type": "static"
        },
        {
        "value": 0.10666666666666667,
        "actuator_id": "067c8c59-710a-4c15-8265-b7f1e49b828c",
        "ttl": 1.412,
        "type": "static"
        },
        {
        "value": 0.10666666666666667,
        "actuator_id": "067c8c59-710a-4c15-8265-b7f1e49b828c",
        "ttl": 1.412,
        "type": "static"
        }
    ]
    }

// Example AcknowledgementMessage
var aM = {
    "message_id": "067c8c59-710a-4c15-8265-b7f1e49b828c",
    "message_type": "acknowledgement",
    "timestamp": 1509748526.3482552
}


// Example Class Usage

let myMessenger = new Messenger('tcp://127.0.0.1:5555');

myMessenger.on('message', function(data){
    var request = JSON.parse(data);
    console.log(request);
    if(request.message_type == "acknowledgement"){
        console.log("Acknowledgement Message");
        myMessenger.send(JSON.stringify(cM));
    }
    else if(request.message_type == "report"){
        console.log("Report Message");
        myMessenger.send(JSON.stringify(aM));
    } else if(request.message_type == "termination") {
        console.log("Termination Message");
    }
});