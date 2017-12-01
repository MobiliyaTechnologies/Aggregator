import cv2
import sys
import json
def read_in():
	lines = sys.stdin.readlines()
   	
	return json.loads(lines[0])

def main():
	
	lines = read_in()
	argument_list=[]

	for item in lines:
		try:
			url=item['streamingUrl']
			#item['streamingUrl'] = url
		
			cam =cv2.VideoCapture(str(url))
			#print("VIDEO CAPTURE:",cv2.VideoCapture(str(url)))
			if cam.isOpened():
				item['camStatus'] = 1
		
		except TypeError:
			item['camStatus'] = 0
		
		argument_list.append(item)
	
	print json.dumps(argument_list)

if __name__ == '__main__':
	main()

