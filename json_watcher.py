import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import os
import json
import requests
#from PIL import Image, ImageFont, ImageDraw


class Watcher:
    DIRECTORY_TO_WATCH = "/home/ubuntu/surveillance/jetson-dl/jetson-inference/build/aarch64"

    def __init__(self):
        self.observer = Observer()

    def run(self):
        event_handler = Handler()
        self.observer.schedule(event_handler, self.DIRECTORY_TO_WATCH)
        self.observer.start()
        try:
            while True:
                time.sleep(3)
        except:
            self.observer.stop()
            print "Error"

        self.observer.join()


class Handler(FileSystemEventHandler):

    @staticmethod
    def on_any_event(event):

        if event.is_directory:
            print "in if"
            return None

        elif event.event_type == 'modified':
            # Take any action here when a file is first created.
            print "\nReceived modified event - %s.\n" % event.src_path
         
            with open(event.src_path, "r") as f:
                content = f.read()

            print "Content of the file :: ",content
            values = json.loads(content)
    
            print "\nJson object = ",values, "\n"
            headers = {'Content-type': 'application/json'}
            #print count_frames
	    #count_frames =count_frames+1
            r = requests.post("http://52.177.169.81:5005/api/getResult",  headers = headers,json = values)
           
if __name__ == '__main__':
	    print "Started watching"
	    
	    current_file = "";
	    w = Watcher()
	    w.run()
