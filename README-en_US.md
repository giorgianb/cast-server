[Instrucciones en español](README-es_ES.md)   
[Instrucțiuni în limba română](README-ro_RO.md)   

# cast-server
The server for the cast software, which allows videos to be cast from a web browser to a Raspberry Pi.

Note: Due to Node.js no longer supporting ARMv6 in their newer releases, at least a Raspberry Pi 2 is required. There is a plan to eventually backport `cast-server` to the original Raspberry Pi.

## Installation
See the [Raspberry Pi Website](https://www.raspberrypi.org/downloads/) for instructions on how to install Raspbian.

Once Raspbian in installed and connected to the internet, run:
```
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt install nodejs git omxplayer figlet
git clone https://gitlab.com/raspberry-pi-cast/cast-server
cd cast-server
npm install
```

## Running 
```
setterm -powersave off -blank 0
cd cast-server
node server.js
```

Now, to cast videos to your Raspberry Pi, please use the 
[cast add-on](https://gitlab.com/raspberry-pi-cast/cast-addon-firefox).


## API
_cast_: GET, Casts a video.  
Parameters:  
&nbsp;&nbsp;**video**: _string_, URL of the video to play.  
Return:  
&nbsp;&nbsp;JSON-Encoded Data: {  
&nbsp;&nbsp;&nbsp;&nbsp;**status**: _int_, MISSING_PARAMETERS if _video_ if not specified, SUCCESS otherwise.  
}   

_togglePause_: GET, Toggles the pause status of a video.  
Parameters:  
&nbsp;&nbsp;_None_  
Return:  
&nbsp;&nbsp;JSON-Encoded Data: {  
&nbsp;&nbsp;&nbsp;&nbsp;status: _int_, INVALID_PARAMETERS if the client IP address does not match the casting IP address, EXPIRED_CAST if no longer costing, SUCCESS otherwise.  
}  

_skipForward_: GET, Skips the video forward by 30 seconds.  
Parameters:  
&nbsp;&nbsp;_None_  
Return:  
&nbsp;&nbsp;JSON-Encoded Data: {  
&nbsp;&nbsp;&nbsp;&nbsp;status: _int_, INVALID_PARAMETERS if the client IP address does not match the casting IP address, EXPIRED_CAST if no longer costing, SUCCESS otherwise.  
}  

_skipBackwards_: GET, Skips the video backwards by 30 seconds.  
Parameters:  
&nbsp;&nbsp;_None_  
Return:  
&nbsp;&nbsp;JSON-Encoded Data: {  
&nbsp;&nbsp;&nbsp;&nbsp;status: _int_, INVALID_PARAMETERS if the client IP address does not match the casting IP address, EXPIRED_CAST if no longer costing, SUCCESS otherwise.  
}  

_volumeUp_: GET, Raises the video volume.  
Parameters:  
&nbsp;&nbsp;_None_  
Return:  
&nbsp;&nbsp;JSON-Encoded Data: {  
&nbsp;&nbsp;&nbsp;&nbsp;status: _int_, INVALID_PARAMETERS if the client IP address does not match the casting IP address, EXPIRED_CAST if no longer costing, SUCCESS otherwise.  
}  

_volumeDown_: GET, Lowers the video volume.  
Parameters:  
&nbsp;&nbsp;_None_  
Return:  
&nbsp;&nbsp;JSON-Encoded Data: {  
&nbsp;&nbsp;&nbsp;&nbsp;status: _int_, INVALID_PARAMETERS if the client IP address does not match the casting IP address, EXPIRED_CAST if no longer costing, SUCCESS otherwise.  
}  

 _isPlaying_: GET, Returns whether the calling client has a video whether that is playing.  
Parameters:  
&nbsp;&nbsp;_None_  
Return:  
&nbsp;&nbsp;JSON-Encoded Data: {  
&nbsp;&nbsp;&nbsp;&nbsp;isPlaying: _isPlaying_, true if the calling client has a playing video, false otherwise.  
}  

_speedUp_: GET, Increases the playback speed of the video.  
Parameters:  
&nbsp;&nbsp;_None_  
Return:  
&nbsp;&nbsp;JSON-Encoded Data: {  
&nbsp;&nbsp;&nbsp;&nbsp;status: _int_, INVALID_PARAMETERS if the client IP address does not match the casting IP address, EXPIRED_CAST if no longer costing, SUCCESS otherwise.  
}  

_slowDown_: GET, Decreases the playback speed of the video.  
Parameters:  
&nbsp;&nbsp;_None_  
Return:  
&nbsp;&nbsp;JSON-Encoded Data: {  
&nbsp;&nbsp;&nbsp;&nbsp;status: _int_, INVALID_PARAMETERS if the client IP address does not match the casting IP address, EXPIRED_CAST if no longer costing, SUCCESS otherwise.  
}  

 _toggleSubtitles_: GET, Toggles whether the video has subtitles.  
Parameters:  
&nbsp;&nbsp;_None_  
Return:  
&nbsp;&nbsp;JSON-Encoded Data: {  
&nbsp;&nbsp;&nbsp;&nbsp;status: _int_, INVALID_PARAMETERS if the client IP address does not match the casting IP address, EXPIRED_CAST if no longer costing, SUCCESS otherwise.  
}  
