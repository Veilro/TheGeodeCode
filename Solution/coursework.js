    import * as THREE from '../Extra\ Libraries/three.js-master/build/three.module.js';

    import { PointerLockControls } from '../Extra\ Libraries/three.js-master/examples/jsm/controls/PointerLockControls.js';

    import { GLTFLoader } from '../Extra\ Libraries/three.js-master/examples/jsm/loaders/GLTFLoader.js';

    // global variables used

    let camera, scene, renderer, controls, player, playermodel, geodemodel, tpcamera;

    let animator, walkanim;

    // objects contains all objects in the scene and is used for collision detection
    const objects = [];
    const interactables = [];
    const lights = [];

    // determines which camera to use
    let firstperson = true;

    let interacting = false;
    let interacted = false;

    // raycasters for collision and camera movement
    let downcollision;
    let upcollision;
    let horizcollision;
    let intercollision;

    let horizcaster;
    let tpcaster;

    // used for player movement
    let forSpeed;
    let sideSpeed;

    let moveForward = false;
    let moveBackward = false;
    let moveLeft = false;
    let moveRight = false;
    let canJump = false;
    let dashing = false;
    let canDash = false;
    let dashdir = new THREE.Vector3();
    let dashvel = 0;

    let prevTime = performance.now();

    // camera controls and player movement
    const velocity = new THREE.Vector3();
    const vectorx = new THREE.Vector3();
    const camvec = new THREE.Vector3();
    const backvec = new THREE.Vector3();
    const vectorz = new THREE.Vector3();

    // for progression management
    let eventprogress = false;
    let geodes = 0;

    // initialising all materials so they can be used outside initial loading for dynamic parts
    let rockmat, glassmat, rockwallmat, beansMat, invisMat, beanNoRep;

    // basic looping variable
    let i;

    // object used in level 3
    let interactable;

    // current music playing, used for dynamic music
    let currmusic;

    // temporary objects for ease
    let light1, light2;
    let tempobj, nextobj, spot;

    // light arrays that can be turned off to preserve fps
    let l1lightarray = []; 
    let l2lightarray = []; 
    let l3lightarray = [];

    let l2movelightarray;

    let lastcheckpoint = new THREE.Vector3();
    const interacttext = document.getElementById( 'interac' );;

    init();
    animate();

    /**
     * Begins the main initialise loop, creates camera and scene, along with the keyboard input listeners.
     * Also sets up mouse controls using the ThreeJS pointerlock controls.
     * 
     */
    function init() {

        // Camera and scene creation
        camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 5000 );
        camera.position.y = 10;

        scene = new THREE.Scene();
        scene.background = new THREE.Color( 0xffffff );

        tpcamera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 5000 );

        controls = new PointerLockControls( camera, document.body );

        // Initialises HTML listeners
        controlHtml();
        getGeode(0);

        // Keyboard input, movement, dashing, camera switching and interaction.
        const onKeyDown = function ( event ) {
            switch ( event.code ) {
                case 'ArrowUp':
                case 'KeyW':
                    moveForward = true;
                    break;

                case 'KeyE':
                    if (interacted == false) {
                        interacting = true;
                    }
                    break;

                case 'ArrowLeft':
                case 'KeyA':
                    moveLeft = true;
                    break;

                case 'ArrowDown':
                case 'KeyS':
                    moveBackward = true;
                    break;

                case 'ArrowRight':
                case 'KeyD':
                    moveRight = true;
                    break;

                case 'Space':
                    if ( canJump === true ) { velocity.y = 400;
                        if (dashing == true) {
                            dashing = false;
                        }
                    }
                    canJump = false;
                    break;
                case 'ShiftLeft':
                    if (canDash) {
                        dashdir = camvec.clone();
                        dashvel = 2000;
                        dashing = true;
                    }
                    break
                case 'KeyT':
                    firstperson = !firstperson;
                    break;
            }

        };

        const onKeyUp = function ( event ) {

            switch ( event.code ) {

                case 'ArrowUp':
                case 'KeyW':
                    moveForward = false;
                    break;

                case 'KeyE':
                    interacting = false;
                    interacted = false;
                    break;        

                case 'ArrowLeft':
                case 'KeyA':
                    moveLeft = false;
                    break;

                case 'ArrowDown':
                case 'KeyS':
                    moveBackward = false;
                    break;

                case 'ArrowRight':
                case 'KeyD':
                    moveRight = false;
                    break;

            }

        };

        
        document.addEventListener( 'keydown', onKeyDown );
        document.addEventListener( 'keyup', onKeyUp );


        /* Initialises all of the required raycasters
        downcollision handles player standing on floor
        upcollision handles player hitting head on roof
        intercollision handles player interacting with objects
        tpcaster handles the third person camera clipping through walls
        horizcollision handles player horizontal movement and collision
        */
        downcollision = new THREE.Raycaster( new THREE.Vector3(), new THREE.Vector3( 0, - 1, 0 ), 0, 25 );
        upcollision = new THREE.Raycaster( new THREE.Vector3(), new THREE.Vector3( 0, + 1 , 0 ), 0, 35 );
        intercollision = new THREE.Raycaster( new THREE.Vector3(), new THREE.Vector3( 0, 0 , 0 ), 0, 200 );
        tpcaster = new THREE.Raycaster( new THREE.Vector3(), new THREE.Vector3( 0, 0 , 0 ), 0, 150 );


        horizcollision = [
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(1, 0, 1),
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(1, 0, -1),
            new THREE.Vector3(0, 0, -1),
            new THREE.Vector3(-1, 0, -1),
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(-1, 0, 1)
        ]

        horizcaster = new THREE.Raycaster();
        horizcaster.far = 21;
        horizcaster.near = 0;
  
        // Creates the renderer
        renderer = new THREE.WebGLRenderer( { antialias: true } );
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( window.innerWidth, window.innerHeight );

        document.body.appendChild( renderer.domElement );

        window.addEventListener( 'resize', onWindowResize );

    }

    /**
     * Loads the GLTF Models and initialises animations and positions.
     */
    function loadModels() {

        const loader = new GLTFLoader();
        let filepath = "../Assets/Models/"

        //Loads the mushroom player model - the position is updated later, this is just a placeholder value
        loader.load(
            filepath + 'playermodel.glb',

            function ( gltf ) {
                
                animator = new THREE.AnimationMixer(gltf.scene);

                walkanim = animator.clipAction(gltf.animations[0]);

                gltf.scene.children[0].scale.set(20, 20, 20);
                gltf.scene.children[0].position.set(0, -50, 0);
                playermodel = gltf.scene.children[0];
            
                scene.add( gltf.scene );

        
            },
            // called while loading is progressing
            function ( xhr ) {
        
                console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
        
            },
            // called when loading has errors
            function ( error ) {
        
                console.log( 'An error happened' );
        
            }
        )

        // Loads the geode model and initialises it to it's position in the first level.
        loader.load(
            filepath + 'geode.glb',
            function ( gltf ) {
                
                gltf.scene.children[0].scale.set(40, 40, 40);
                gltf.scene.children[0].position.set(-50, 890, -1050);
                geodemodel = gltf.scene.children[0];
            
                scene.add( gltf.scene );

        
            },
            // called while loading is progressing
            function ( xhr ) {
        
                console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
        
            },
            // called when loading has errors
            function ( error ) {
        
                console.log( 'An error happened' );
        
            }
        )
    }

    /**
     * This function loads the textures and materials used in the game
     */
    function loadTextures() {
        const textload = new THREE.TextureLoader() 

        let filepath = "../Assets/textures/";

        const rocktex = textload.load( filepath + 'rock.jpg' );
        const rockao = textload.load( filepath + 'rockao.jpg' );
        const rocknormal = textload.load( filepath + 'rocknormal.jpg');
        const rockroughness = textload.load( filepath + 'rockroughness.jpg');
        const rockheight = textload.load( filepath + 'rockheight.png');
        const rockwall = textload.load( filepath + 'rockwall.jpg');
        const rockwallnormal = textload.load( filepath + 'rockwallnormal.jpg');
        const glasstex = textload.load( filepath + 'glass.jpg');
        const glassao = textload.load( filepath + 'glassao.jpg');
        const beanTex = textload.load( filepath + 'beans.jpg' );
        const beanTex2 = textload.load( filepath + 'beans.jpg' );
        beanTex.wrapS = THREE.MirroredRepeatWrapping;
        beanTex.wrapT = THREE.MirroredRepeatWrapping;
        beanTex.repeat.set(30, 30);

        rockmat = new THREE.MeshStandardMaterial({map:rocktex, aoMap:rockao, normalMap:rocknormal, envMap:rockheight, roughnessMap:rockroughness, side:THREE.DoubleSide});
        rockwallmat = new THREE.MeshStandardMaterial({map:rockwall, normalMap:rockwallnormal, side:THREE.DoubleSide});
        glassmat = new THREE.MeshStandardMaterial({map:glasstex, aoMap:glassao, transparent:true, side:THREE.DoubleSide, opacity:0.8});
        beansMat = new THREE.MeshBasicMaterial( {map:beanTex} );
        beanNoRep = new THREE.MeshBasicMaterial( {map:beanTex2, side:THREE.DoubleSide} );
        invisMat = new THREE.MeshBasicMaterial({color: 0x000000, opacity: 0, transparent: true})
    }

    /**
     * This function handles creation of levels, textures, models, all the main game assets.
     */
    function initStatic() {
        // intialise hub checkpoint
        lastcheckpoint.set(0, 300, 0);

        // Creation of players and cameras and binding cameras to players
        player = new THREE.Object3D();
        playermodel = new THREE.Object3D();
        scene.add(player);
        camera.parent = player;
        tpcamera.parent = camera;
        camera.position.set(0, 30, 0);
        tpcamera.position.set(camera.position.x + 10, camera.position.y, camera.position.z + 70);

        worldEvent(1, lastcheckpoint);

        // Loads textures and models
        loadTextures();
        loadModels();

        // This value just holds returned lights so they can be added to an array.
        let templi;

        // This part handles level design for all three levels, and initialises the values.
        createObject(new THREE.Vector3(0, 200, 0), new THREE.BoxGeometry(400, 250, 400), [rockwallmat, rockwallmat, rockwallmat, glassmat, rockwallmat, rockwallmat], 0);

        //baby steps level 1
        createObject(new THREE.Vector3(0, 200, -199), new THREE.PlaneGeometry(100, 100), rockmat, [2, new THREE.Vector3(0, 400, -400)]);
        light1 = createLight(new THREE.Vector3(0, 200, -150 ), new THREE.PointLight( 0x999999, 2, 200));

        createObject(new THREE.Vector3(50, 700, -750), new THREE.BoxGeometry(500, 800, 1000), rockmat, 0);
        templi = createLight(new THREE.Vector3(50, 700, -750 ), new THREE.PointLight( 0x999999, 2, 1200));

        // Lights are saved so that they can be turned off to preserve fps
        l1lightarray.push(templi);

        // Platforms in the level
        let array = [
            new THREE.Vector3(-75, 350, -500),
            new THREE.Vector3(0, 420, -700),
            new THREE.Vector3(-50, 450, -1100),
            new THREE.Vector3(200, 550, -1100),
            new THREE.Vector3(150, 650, -750),
            new THREE.Vector3(-50, 750, -400),
            new THREE.Vector3(-50, 820, -1050)
        ]

        for (i = 0; i < array.length; i++) {
            createObject(array[i], new THREE.BoxGeometry(150, 50, 150), rockmat, 0);
        }

        //geode 1
        createObject(new THREE.Vector3(-50, 890, -1050), new THREE.BoxGeometry(50, 50, 50), invisMat, [4, 1]);
        templi = createLight(new THREE.Vector3(-50, 930, -1050 ), new THREE.PointLight( 0xF28C28, 3, 300));

        l1lightarray.push(templi);

        //lights in the dark level 2
        
        createObject(new THREE.Vector3(-750, 800, 0), new THREE.BoxGeometry(1000, 1000, 1000), rockmat, 0);
        templi = createLight(new THREE.Vector3(-600, 400, 0 ), new THREE.PointLight( 0x999999, 2, 500));

        l2lightarray.push(templi);

        // Randomly creates the platforms
        let j;
        for (j = 0; j < 4; j++) {
            for (i = 0; i < 4; i++) {
                createObject(new THREE.Vector3(-400 - i * 200, 500 + (j*150) + (Math.random()*160 - 80), (Math.random()*850 - 425)), new THREE.BoxGeometry(150, 50, 150), (Math.random() > 0.5 ? rockmat : glassmat), 0);
            }
        }
          
        // Lights are dynamic and randomly assigned using this array
        l2movelightarray = [
            createLight(new THREE.Vector3(0, -600, 0 ), new THREE.PointLight( 0x999999, 4, 500)),
            createLight(new THREE.Vector3(0, -600, 0 ), new THREE.PointLight( 0x999999, 4, 500)),
            createLight(new THREE.Vector3(0, -600, 0 ), new THREE.PointLight( 0x999999, 4, 500))
        ]

        for (i = 0; i < 3; i++) {
            l2lightarray.push(l2movelightarray[i]);
        }

        //geode 2
        createObject(new THREE.Vector3(-750, 1200, 0), new THREE.BoxGeometry(50, 50, 50), invisMat, [4, 2]);
        templi = createLight(new THREE.Vector3(-750, 1240, 0), new THREE.PointLight( 0xF28C28, 3, 400));

        l2lightarray.push(templi);

        //timed jump level 3
        tempobj = createObject(new THREE.Vector3(0, -600, 0), new THREE.BoxGeometry(100, 50, 100), rockmat, 0);    
        nextobj = createObject(new THREE.Vector3(0, -600, 0), new THREE.BoxGeometry(20, 50, 20), glassmat, 0);                            
        spot = createLight(new THREE.Vector3(0, -600, 0), new THREE.SpotLight( 0xffffff, 1, 200, Math.PI/4));
        l3lightarray.push(spot);

        templi = createLight(new THREE.Vector3(0, 300, 750), new THREE.PointLight( 0xffffff, 1, 300));

        l3lightarray.push(templi);
 
        //outer cave
        createObject(new THREE.Vector3(0, 400, 1700), new THREE.BoxGeometry(500, 1200, 2000), rockmat, 0);
        
        //ends
        createObject(new THREE.Vector3(0, 200, 800), new THREE.BoxGeometry(500, 50, 250), rockmat, 0);
        createObject(new THREE.Vector3(0, 200, 2650), new THREE.BoxGeometry(500, 50, 250), rockmat, 0);

        //geode 3
        createObject(new THREE.Vector3(0, 280, 2620), new THREE.BoxGeometry(50, 50, 50), invisMat, [4, 3]);
        templi = createLight(new THREE.Vector3(0, 320, 2620), new THREE.PointLight( 0xF28C28, 3, 400));        
        l3lightarray.push(templi);

        //interactable
        interactable = createObject(new THREE.Vector3(-150, 275, 800), new THREE.BoxGeometry(25, 100, 25), rockwallmat, [3, [new THREE.Vector3(0, 199, 900), 8]]);

        // Creates the random static lights for level 3
        for (i = 0; i < 2000; i+= 200) {
            templi = createLight(new THREE.Vector3(0 + (Math.random() * 400 -200) , 300 + (Math.random() * 400 -200), 1000 + i ), new THREE.PointLight( 0xaaaaaa, 1, 400));
            l3lightarray.push(templi);
        }

        // Creates the killplane, a floor plane with a repeating beans texture
        const floorGeometry = new THREE.PlaneGeometry( 8000, 8000, 800 );
        floorGeometry.rotateX( - Math.PI / 2 );
        createObject(new THREE.Vector3(0, -100, 0), floorGeometry, beansMat, 0);

        // Turns lights off for levels 2 and 3 for fps reasons
        toggleLights(2);
        toggleLights(3);

    }

    // These are the helper functions 

    /** 
     * This function manages the HTML and listeners to handle the main menu and the pause menu
     * Primarily handles transitions between menu and game
     */
    function controlHtml() {
        const l1 = document.getElementById( 'level1' );
        const contin = document.getElementById( 'continue' );
        const mainmenu = document.getElementById( 'mainmenu' );

        // Called when going from main menu to actual game
        l1.addEventListener( 'click', function () {

            currmusic = musicHandler(2);
            controls.lock();
            menu.style.display = 'none';
            initStatic();

        } );

        // Continues from pause menu
        contin.addEventListener( 'click', function () {

            controls.lock();
            currmusic.play();
            pause.style.display = 'none';

        } );

        // GOes back to main menu from pause menu
        mainmenu.addEventListener( 'click', function () {

            pause.style.display = 'none';
            menu.style.display = 'block';
            reset();

        } );

        // When you are in the actual game the main menu is hidden
        controls.addEventListener( 'lock', function () {

            menu.style.display = 'none';

        } );

        // When focus is lost, the pause menu is brought up
        controls.addEventListener( 'unlock', function () {

            if (geodes != 3) {
            currmusic.pause();
            pause.style.display = 'block';
            }

        } );

    }

    /**
     * This function deletes the scene and associated objects for when game ends
     * through completion or returning to main menu
     */
    function reset() {
        currmusic.stop();
        // Clears scene arrays used
        while (objects.length > 0 || lights.length > 0 || interactables.length > 0) {
            objects.pop();
            lights.pop();
            interactables.pop();            
        }

        endtext.innerHTML = "You got a Geode!";

        firstperson = true;
        geodes = 0;
        count.innerHTML = "<span>Geodes: " + geodes + "/3</span>";

        interactable.position.set(-150, 275, 800)

        for (i = scene.children.length; i > 0; i--) {
            scene.remove(scene.children[i]);
        }
    }

    /**
     * This functions handles the music and other sounds, which dynamically 
     * play as the player progresses through the game.
     * Plays the sound passed to it
     * @param soundid The id of the sound that should be played
     * @returns The sound so that it can be paused and played at will
     */
    function musicHandler(soundid) {
        const listener = new THREE.AudioListener();
        camera.add( listener );

        // create a global audio source
        let sound = new THREE.Audio( listener );

        const audioLoader = new THREE.AudioLoader();

        let filepath = "../Assets/sounds/"

        // The pickup noise for when the player gets a geode
        switch(soundid) {
            case(1):
        audioLoader.load( filepath + 'Pickup\ Item.wav', function( buffer ) {
            sound.setBuffer( buffer );
            sound.setVolume( 0.2 );
            sound.play();
        });
        break;
        case(2):

        // The initial music when you have no geodes
        audioLoader.load( filepath + 'caveLoop1.wav', function( buffer ) {
            sound.setBuffer( buffer );
            sound.setLoop( true );
            sound.setVolume( 0.7 );
            sound.play();
        });
        break;
        case(3):

        // The second loop of music when you have one geode
        audioLoader.load( filepath + 'caveLoop2.wav', function( buffer ) {
            sound.setBuffer( buffer );
            sound.setLoop( true );
            sound.setVolume( 0.7 );
            sound.play();
        });
        break;
        case(4):
        
        // The final loop of music when you have two geodes
        audioLoader.load( filepath + 'caveLoop3.wav', function( buffer ) {
            sound.setBuffer( buffer );
            sound.setLoop( true );
            sound.setVolume( 0.7 );
            sound.play();
        });
        break;
    }

    return sound;
    }

    /**
     * This function makes the lights invisible for sections of the game the player will not see
     * This reduces lag and prevents lights clipping through walls
     * @param level Determines which set of lights to be turned off relative to level
     */
    function toggleLights(level) {
        let arr;
        switch(level) {
            case 1:
                arr = l1lightarray;
            break;
            case 2:
                arr = l2lightarray;
            break;
            case 3:
                arr = l3lightarray;
            break;
        }

        for (i = 0; i < arr.length; i ++) {
            arr[i].visible = !arr[i].visible;
        }
    }

    /**
     * This function is a helper function that creates an object in the level and adds it to the collision array (objects)
     * @param position where the object is placed in the world
     * @param geom the dimensions and shape of the object
     * @param mat the material of the object
     * @param interac whether the object is interactable and what is called when the user interacts with it
     * @returns the initalised object
     */
    function createObject(position, geom, mat, interac) {
        const plat = new THREE.Mesh(geom, mat);
        plat.position.set(position.x, position.y, position.z);
        scene.add(plat);
        objects.push(plat);
        // If it is interactable, it is added to the interactable array and the data added
        if (interac != 0) {
            interactables.push(plat);
            plat.userData = interac;
        }

        return plat;
    }

    /**
     * This function is a helper function that creates a light in the world and adds it to the light array
     * @param position where the light is placed in the world
     * @param light which type of light it is, and data such as intensity etc
     * @returns the initialised light
     */
    function createLight(position, light) {
        light.position.set(position.x, position.y, position.z);
        scene.add(light);
        lights.push(light)
        return light;
    }

    /**
     * This is a helper function that manages the "You Got a Geode!" screen popup - the popup also works as a rudimentary loading screen
     * @param visible flag that sets the popup to be visible or not, and changes it to the end game one
     */
    function getGeode(visible) {

        // Called when player gets a geode, shows popup and updates values
        if (visible == 1) {
            get.style.display = 'block';
            hud.style.display = 'none';
            count.innerHTML = "<span>Geodes: " + geodes + "/3</span>";
        } else {
            get.style.display = 'none';
            hud.style.display = 'block';
        }

        // Called when third geode is obtained, ends the game and has a final splash screen
        if (visible == 2) {
            get.style.display = 'block';
            hud.style.display = 'none';
            endtext.innerHTML = "Thanks for Playing!";
            controls.unlock();
            pause.style.display = 'none';
        }
    }

    /**
     * This function allows an interval to be called a set number of times
     * Taken from https://stackoverflow.com/questions/2956966/javascript-telling-setinterval-to-only-fire-x-amount-of-times
     * @param callback the function to be called each repetition
     * @param delay the time between repetitions
     * @param repetitions the number of repetitions to occur
     */
    function setIntervalX(callback, delay, repetitions) {
        var x = 0;
        var intervalID = window.setInterval(function () {
    
           callback();
    
           if (++x === repetitions) {
               window.clearInterval(intervalID);
           }
        }, delay);
    }

    /**
     * This function changes the screen when the window resizes to ensure the game window is the same size
     */
    function onWindowResize() {

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        tpcamera.aspect = window.innerWidth / window.innerHeight;
        tpcamera.updateProjectionMatrix();


        renderer.setSize( window.innerWidth, window.innerHeight );

    }

    // This group of functions handles the game logic itself

    /**
     * This function has the major world events that can be called - usually by the player interacting with an object
     * @param eventcode which world event should be called - for example teleport or reset checkpoint
     * @param eventdata what data should be used along with the event - for example the position to teleport the player
     */
    function worldEvent(eventcode, eventdata) {
        switch(eventcode) {
            // event =teleport player
            // data = position
            case 1:
                player.position.x = eventdata.x;   
                player.position.y = eventdata.y;    
                player.position.z = eventdata.z;  
                break;  
            case 2:
            // event = teleport player and set checkpoint to teleported location
            // data = position
            worldEvent(1, eventdata);
            lastcheckpoint.set(eventdata.x ,eventdata.y, eventdata.z)
                break;
            case 3:
                // event = begins the moving platform in level 3
                // data = start location and distance (how many steps should be carried out)
                if (eventprogress == false) {
                    // initialises platform and spotlight position
                    eventprogress = true;
                    tempobj.position.set(eventdata[0].x, eventdata[0].y, eventdata[0].z);
                    spot.position.y += 100;
                    spot.target = tempobj;

                    // indicates the event is in progress
                    interactable.position.y -= 50;
                
                    let k = 199;
                    let j = 0;
                    let nextx = Math.random() * 200 - 100;
                    nextobj.position.set(nextx, tempobj.position.y, tempobj.position.z + k);
                    
                    // runs the moving platforms
                    setIntervalX(()=>{  setIntervalX(()=>{spot.angle-=Math.PI/18;}, 700, 3);
                        // spotlight angle decreases to indicate platform is about to move
                        if (k == 200) {
                            spot.angle = Math.PI/6 + Math.PI/18;
                        } else {
                            spot.angle = Math.PI/6;
                            k = 200;
                        }

                        // move the platform
                        tempobj.position.z += k;
                        tempobj.position.x = nextx;
                        nextx = Math.random() * 200 - 100
                        spot.position.set(tempobj.position.x, tempobj.position.y, tempobj.position.z);
                        spot.position.y += 100;
                        j ++;

                        if (j == eventdata[1] - 1) {
                            nextobj.position.set(0, - 600, 0);
                        } else {
                            nextobj.position.set(nextx, tempobj.position.y, tempobj.position.z + k);
                        }
                        // end event and reset all objects to hidden position
                        if (j == eventdata[1]) {
                            eventprogress = false;
                            tempobj.position.set(0, -600, 0);
                            nextobj.position.set(0, -600, 0);
                            spot.position.set(0, -600, 0);
                            interactable.position.y += 50;
                        }
                    }, 2100, eventdata[1]+1);
                 
                }
                break;
            case 4:
                // event = collect geode and progress through game
                // data = which number geode is collected

                // handles error if user somehow gets geode again
                if (eventdata > geodes) {
                    geodes = eventdata;
                    currmusic.stop();
                    musicHandler(1);
                
                // shows popup screen
                getGeode(1);

                // determines which progression step should be taken based on how many geodes the player has
               switch(geodes) {
                   case(1):
                    // creates the teleporter to level 2 and changes the lights to indicate which level to go to next
                    let templane = createObject(new THREE.Vector3(-199, 200, 0), new THREE.PlaneGeometry(100, 100), glassmat, [2, new THREE.Vector3(-400, 400, 0)]);
                    templane.rotateY(Math.PI/2);
                    light2 = createLight(new THREE.Vector3(-150, 200, 0 ), new THREE.PointLight( 0x999999, 2, 200));
                    light1.color.setHex( 0xff00bb00);
                    geodemodel.position.set(-750, 1200, 0);

                    // turns off the lights for level 1 for fps reasons
                    toggleLights(1);
                    toggleLights(2);
            
                    // starts the randomly moving lights in level 2
                    setInterval(function () {
                        for (i = 0; i < l2movelightarray.length; i++) {
                            l2movelightarray[i].position.set(-750 + (Math.random()*1000 - 500), 800+ (Math.random()*1000 - 500), (Math.random()*1000 - 500))
                        }
                    }, 3000);
                    break;

                    // creates the teleporter to level 3 and changes the lights to show level 3
                    case(2):
                    createObject(new THREE.Vector3(0, 200, 199), new THREE.PlaneGeometry(100, 100), beanNoRep, [2, new THREE.Vector3(0, 400, 750)]);
                    createLight(new THREE.Vector3(0, 200, 150 ), new THREE.PointLight( 0x999999, 2, 200));
                    light2.color.setHex( 0xff00bb00);
                    geodemodel.position.set(0, 280, 2620);

                    toggleLights(2);
                    toggleLights(3);
                    break;

                    // ends the game and congratulates the player
                    case(3):
                    
                    getGeode(2);
                    toggleLights(3);

                    break;
                } 

                // changes music to the next loop
                if (geodes < 3) {
                setTimeout(() => {
                    worldEvent(2, new THREE.Vector3(0, 200, 0));
                    getGeode(0); 
                    currmusic = musicHandler(geodes+2);
                }, 2250);
                } else {
                    // ends the game and returns to main menu
                    setTimeout(() => {
                        reset();
                        menu.style.display = 'block';
                        get.style.display = 'none';
                        hud.style.display = 'block';
                    }, 3000);
                }
            }
        }


    }

    /**
     * function that handles animation, camera switching and calls the controls function
     */
    function animate() {

        requestAnimationFrame( animate );

        const time = performance.now();

        const delta = ( time - prevTime ) / 1000;

        if ( controls.isLocked === true ) {

           handleControls( delta );
            
        }

        // handles the geode spin animation
        if (geodemodel != null) {
            geodemodel.rotation.y += 0.7 * delta;
        }
       

        prevTime = time;

        if (firstperson) {
            renderer.render( scene, camera );
        } else {
            renderer.render( scene, tpcamera );
        }

    }


    /**
     * This function controls collision, controls and playermodel animations
     * @param delta the time delta to ensure gameplay is consistent regardless of performance
     */
    function handleControls( delta ) {

        // getting camera vectors for movement
        vectorx.setFromMatrixColumn( camera.matrix, 0 );
        vectorx.crossVectors( camera.up, vectorx );

        vectorz.setFromMatrixColumn( camera.matrix, 0 );

        camera.getWorldDirection(camvec);
        backvec.copy(camvec);
        backvec.negate();

        // This set of lines handles raycasting for camera and up and down collision

        // interactable collision ray, shoots out of player and allows interaction when it crosses an interactable object
        intercollision.ray.origin.copy( player.position );
        intercollision.ray.origin.y += 25;
        intercollision.ray.direction = camvec;
        const interintersections = intercollision.intersectObjects( interactables, false );

        if (interintersections[0] != null && interintersections[0].object.userData != 0) {
        interacttext.style.display = '';
        if (interacting == true) {
            let tempinter = interintersections[0].object;
            worldEvent(tempinter.userData[0], tempinter.userData[1]);
            if (tempinter.userData[0] == 2) {
                tempinter.userData = 0;
            }
            interacted = true;
            interacting = false;
        }
        } else {
            interacttext.style.display = 'none';
        }

        // down collision, allows player to stand on objects
        downcollision.ray.origin.copy( player.position );
        downcollision.ray.origin.y -= 60;
        const downintersections = downcollision.intersectObjects( objects, false );
        const onObject = downintersections.length > 0;

        // up collision, prevents clipping through ceilings
        upcollision.ray.origin.copy( player.position );
        upcollision.ray.origin.y += 10;
        const upintersections = upcollision.intersectObjects( objects, false );

        // third person ray - this attempts to prevent the third person camera clipping through walls behind the player
        tpcaster.ray.origin.copy( player.position );
        tpcaster.ray.direction = backvec;
        const tpintersections = tpcaster.intersectObjects( objects, false );

        if (tpintersections.length > 0) {
            let tempos = tpintersections[0].distance;
            tpcamera.position.set(camera.position.x + 20, camera.position.y, camera.position.z + (tempos-15));
        } else {
            tpcamera.position.set(camera.position.x + 20, camera.position.y, camera.position.z + 150);
        }

        // each component is modified by several different blocks, then added to the player position at the end of each loop
        // this allows collision management
        let zComponent = 0;
        let xComponent = 0;
        let yComponent = 0;

        sideSpeed = 400 * delta * vectorx.x;
        forSpeed = 400 * delta * vectorz.x;

        // horizontal movement with WASD
        if ( moveForward) {
            zComponent -= forSpeed;
            xComponent += sideSpeed;
        }
        if ( moveBackward) {
            zComponent += forSpeed;
            xComponent -= sideSpeed;
        }
        if ( moveLeft) {
            zComponent -= sideSpeed;
            xComponent -= forSpeed;
        }
        if ( moveRight) {
            zComponent += sideSpeed;
            xComponent += forSpeed
        }

        // prevents diagonal movement being faster by using trigonometry
        if ((moveForward && moveLeft) || (moveForward && moveRight) || (moveBackward && moveLeft) || (moveBackward && moveRight)) {
            zComponent = zComponent * Math.sin(45);
            xComponent = xComponent * Math.cos(45);
        }

        // when player is standing on surface, allow jumping and dashing, and when player is not, 
        // introduce gravity with terminal velocity to prevent clipping when traveling too fast
        if ( onObject === true ) {

            velocity.y = Math.max( 0, velocity.y );
            canJump = true;
            if (dashing == false) {
                canDash = true;
            }

        } else {
            if (velocity.y * delta > -44) {
                velocity.y -= 800 * delta;
            } else {
                velocity.y = -44/delta
            }
            // allows dashes to be cancelled with jump to allow advanced movement
            if (dashing == true) {
                canJump = true;
            } else {
                canJump = false;
            }
        }

        if (player.position.y < 0) {
            worldEvent(1, lastcheckpoint);
        }
    
        // makes velocity consistent with delta
        yComponent = velocity.y * delta;


        // handles dash movement
        if (dashing == true) {
            canDash = false;
            velocity.y = 0;
            xComponent = dashvel * delta * dashdir.x;
            yComponent = dashvel * delta * dashdir.y;
            zComponent = dashvel * delta * dashdir.z;
            dashvel -=100 * delta * 75;

            // makes the playermodel do a flip when a dash is primarily horizontal
            let max = Math.max(Math.abs(camvec.z), Math.abs(camvec.x), Math.abs(camvec.y));
            if (max == Math.abs(camvec.z)) {
            playermodel.rotation.x -= vectorz.x/2;
            } else if (max == Math.abs(camvec.x)) {
                if (camvec.x > 0) {
                playermodel.rotation.z += vectorx.x/2;
                } else {
                    playermodel.rotation.z -= vectorx.x/2;
                }
            }
        } 
        else if (dashvel > 0) {
            // maintains momentum after a dashcancel
            xComponent += dashvel * delta * dashdir.x;
            yComponent += dashvel * delta * dashdir.y;
            zComponent += dashvel * delta * dashdir.z;
            dashvel -= (dashvel/10 + 5) * delta * 75;
        }

        // resets rotation
        if (dashvel <= 0) {
            dashing = false;
            dashvel = 0;

            playermodel.rotation.x = 0;
            playermodel.rotation.y = 0;
            playermodel.rotation.z = 0;
        }

        var i, j, collisions;

        // this handles horizontal collision using the horizcasters - bit more involved than the other collisions
        for (j = 0; j < 3; j++) {
            for (i = 0; i < horizcollision.length; i += 1) {
                // for each of the 8 directions, the raycaster points towards each
                horizcaster.ray.set(player.position, horizcollision[i]);
                // three different y values so that the player cannot clip through walls at a certain height
                switch(j) {
                    case 0:
                    horizcaster.ray.origin.y -= 60;
                    break;
                    case 1:
                    horizcaster.ray.origin.y -= 20;
                    break;
                    case 2:
                    horizcaster.ray.origin.y += 30;    
                    break;
                }

                // find collisions for each raycaster
                // if there is a collision and the player is 'moving' in that direction, prevent movement this loop
                collisions = horizcaster.intersectObjects(objects, false);
                    if (collisions.length > 0) {
                    if ((i === 0 || i == 1 || i === 7) && zComponent > 0) {
                        zComponent = 0;
                    } else if ((i === 3 || i === 4 || i === 5) && zComponent < 0) {
                        zComponent = 0;
                    }
                    if ((i === 1 || i === 2 || i === 3) && xComponent > 0) {
                        xComponent = 0;
                    } else if ((i === 5 || i === 6 || i === 7) && xComponent < 0) {
                        xComponent = 0;
                    }
                    }
                }
        }

        if (onObject && yComponent < 0) {
            yComponent = 0;
        }

        if (upintersections.length > 0 && yComponent > 0) {
            yComponent = 0;
            velocity.y = 0;
        }

        // plays the walk animation of the mushroom swaying
        if (xComponent != 0 || zComponent !=0 && dashing == false) {
            if (walkanim != null) {
                walkanim.play();
                animator.update(delta);
            }

        }

        // increments player potion in each direction individually
        player.position.z += zComponent;
        player.position.x += xComponent;
        player.position.y += yComponent;

        player.updateWorldMatrix(false, true);
        tpcamera.updateWorldMatrix(false, true);

        // ensures the playermodel faces away from the camera when in thirdperson mode
        if (playermodel != null) {
        playermodel.position.set(player.position.x, player.position.y-75, player.position.z);
            if (camvec.z < 0) {
            playermodel.rotation.y = -camvec.x - Math.PI/2;
            } else {
                playermodel.rotation.y = +camvec.x + Math.PI/2;
            }

            playermodel.updateWorldMatrix(false, true);

            if (firstperson == true) {
                playermodel.visible = false;
            } else {
                playermodel.visible = true;
            }
        }

    }

