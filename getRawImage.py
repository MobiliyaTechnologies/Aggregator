import sys, json
import cv2
import threading
import datetime
import os
import requests

def read_in():
	lines = sys.stdin.readlines()
	# Since our input would only be having one line, parse our JSON data from that
	return json.loads(lines[0])

def main():
	#get our data as an array from read_in()
	lines = read_in()
	argument_list=[]
	for item in lines:
		argument_list.append(item)

	detection_id = str(argument_list[0])
	camera_id = str(argument_list[1])
	cam_url=str(argument_list[2])
	
	cam =cv2.VideoCapture(cam_url)
	if cam.isOpened():
		ret,img = cam.read()
		
		filename = camera_id+".jpg"

		cv2.imwrite(os.path.join("." ,filename), img,[int(cv2.IMWRITE_JPEG_QUALITY), 50])

		#server url
		try:
		    	url = argument_list[3]
			files = {'file': open(filename, 'rb')}
			requests.post(url, files=files)
			cv2.waitKey(100)
		except requests.exceptions.Timeout:
	    		print "**SERVER ERROR:: Timeout in sending Raw Image"
		except requests.exceptions.TooManyRedirects:
	    		print "**SERVER ERROR:: Too many Redirects..!!"
		except requests.exceptions.RequestException as e:
	    		print e
	else:
		print "		***DVR ERROR!!! "

# Start process
if __name__ == '__main__':
    main()

