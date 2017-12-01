import os
import signal
#os.path.isfile(path)
import sys
import json

def read_in():
    lines = sys.stdin.readlines()
    return json.loads(lines[0])

def main():
	lines = read_in()
	for item in lines:		
		camera_id=str(item)
	#camera_id=4
	#print ("camera_id::",camera_id)
	if os.path.exists('./stopProcessing'):
		with open('./stopProcessing') as f:
			    content = f.readlines()
		old_file=content
		content = [x.strip() for x in content] 
		f.close()
		fd = open("./stopProcessing","w")
		fd.close()
		# you may also want to remove whitespace characters like `\n` at the end of each line
		d={}
		fd = open("./stopProcessing","a")
		#print ("Content::",content)
		for x in content:
			if len(x) is not 0:
				#print ("X:::",x)
				key,value=x.split(" ")
				if camera_id==str(key):
					
					pid=str(value)
					#print ("PID ::",pid)
					try:
						os.system("kill -9 "+pid)
						print ("Kill")
					except OSError:
						print ("Couldn't kill !")
				else:
					#print key
					fd.write(str(key)+" "+pid+"\n")
							
		fd.close()
	if os.path.exists('./stopProcessingDetectnet'):
		with open('./stopProcessingDetectnet') as fD:
			    contentD = fD.readlines()
		old_fileD=contentD
		contentD = [x.strip() for x in contentD] 
		fD.close()
		fdD = open("./stopProcessingDetectnet","w")
		fdD.close()
		# you may also want to remove whitespace characters like `\n` at the end of each line
		dD={}
		fdD = open("./stopProcessingDetectnet","a")
		#print ("Content::",contentD)
		for x in contentD:
			if len(x) is not 0:
				#print ("X:::",x)
				key,value=x.split(" ")
				if camera_id==str(key):
					
					pid=str(value)
					#print ("PID ::",pid)
					try:
						os.system("kill -9 "+pid)
						print ("Kill")
					except OSError:
						print ("Couldn't kill !")
				else:
					print key
					fdD.write(str(key)+" "+pid+"\n")
							
		fdD.close()


if __name__ == '__main__':
    main()

