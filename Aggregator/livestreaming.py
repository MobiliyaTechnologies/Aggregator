import sys, json
import cv2
import threading
import datetime
import os
import time
import requests

#Read data from stdin
def read_in():
    lines = sys.stdin.readlines()
    # Since our input would only be having one line, parse our JSON data from that
    return json.loads(lines[0])

def main():
	#get our data as an array from read_in()
	lines = read_in()
	#print (lines)
	#print (type(lines))
	argument_list=[]
	for item in lines:
		argument_list.append(item)
	
	detection_id = str(argument_list[0])
	camera_id = str(argument_list[1])
	cam_url=str(argument_list[2])
	#print (argument_list[3])
	print(detection_id,camera_id)

	pid=str(os.getpid())
	
	with open(argument_list[3], "a") as fd:
		fd.write("\n"+camera_id+" "+pid)

	if detection_id=="0":
		detection_type="humanDetection"
	elif detection_id=="1":
		detection_type="vehicleDetection"
	print ("Detection Type_______________________________________________________________________________________",detection_type)
	jetsonFolderPath = argument_list[5]+ str(camera_id)
	#print jetsonFolderPath
	print "URL to stream::",cam_url
	count_frames = 1
	try:
		cam=cv2.VideoCapture(cam_url)

		#cam.set(cv2.cv.CV_CAP_PROP_FPS, 5)
		while(True):
			#cam=cv2.VideoCapture(cam_url)
			if cam.isOpened():
				ret,imgtemp=cam.read()
				
				#time1=datetime.datetime.now()
				#timestamp = time1.strftime('%Y%m%d%H%M%S')
				timestamp =  int(round(time.time() * 1000))

				filename = str(camera_id)+"_"+detection_type+"_"+str(timestamp)+".jpg"

				filePathLocal = argument_list[4]+str(camera_id)
				filePathJoin = os.path.join(filePathLocal ,filename)
				file_path =  os.getcwd()+ filePathJoin
				imgname = file_path
				ryncPath = os.getcwd()+filePathLocal 

				if imgtemp is not None:
					if(count_frames%25==0):
						#print "FILEPATH:::",file_path
						cv2.imwrite(file_path, imgtemp,[int(cv2.IMWRITE_JPEG_QUALITY), 50])
						#print "*****************IMWRITE FILENAME:::**************",filename
						rsyncCommand="rsync -avz -e ssh "+ryncPath+"/ "+jetsonFolderPath
						#print rsyncCommand
						
						os.system(rsyncCommand)
						#imgname=str(os.getcwd()+file_path+"/"+filename)
						#os.path.join(file_path ,filename)
						#print imgname
						#time.sleep(0.2)
						#print argument_list[6]
						
						try:
							url = argument_list[6]
							print "IMAGE LOCATION:",imgname
							files = {'file': open(imgname, 'rb')}
							#print files
							requests.post(url, files=files)
							os.remove(str(imgname))
							#time.sleep(1)
							#cv2.waitKey(100)
						except requests.exceptions.Timeout:
						    		print "**SERVER ERROR:: Timeout in sending Image"
						except requests.exceptions.TooManyRedirects:
						    		print "**SERVER ERROR:: Too many Redirects..!!"
						except requests.exceptions.RequestException as e:
						    		print e
					#time.sleep(0.6)
					count_frames=count_frames+1
			else :
				print "IN Livestream :: ERROR Opening stream !!"
				
	except KeyboardInterrupt:
		os.system("ps -ef |grep livestreaming.py | awk '{print $2}'| xargs kill -9")

# # Start process
if __name__ == '__main__':
    main()
